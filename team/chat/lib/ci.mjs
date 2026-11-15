// A small CI pipeline: whenever a branch's latest commit changes, build and test it, and post the result.
import { execFile, spawn } from 'node:child_process';
import path from 'node:path';
import { HISTORY, REPO, broadcast, notify } from './store.mjs';
import fs from 'node:fs';

const STATE_FILE = path.join(HISTORY, 'ci-state.json');
/** Runs `node --check` on every .js/.mjs file under the current folder (skipping node_modules and data). */
const CHECK_ALL = `
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
let bad = 0, n = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  if (['node_modules', 'data'].includes(e.name) || e.name.startsWith('.')) continue;
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p);
  else if (/\\.m?js$/.test(e.name)) { n++; try { execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' }); } catch (err) { bad++; console.log(String(err.stderr)); } }
} })('.');
console.log(n + ' files checked, ' + bad + ' with syntax errors');
process.exit(bad ? 1 : 0);`;
const VITEST = path.join(REPO, 'node_modules', 'vitest', 'vitest.mjs');
const POLL_MS = 30e3;

/** branch -> { branch, worktree, sha, subject, status, tests, duration, finishedAt, log } */
const builds = new Map(Object.entries((() => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } })()));
const persist = () => fs.writeFileSync(STATE_FILE, JSON.stringify(Object.fromEntries(builds), null, 2));
export const listBuilds = () => [...builds.values()].sort((a, b) => (a.branch === 'main' ? -1 : b.branch === 'main' ? 1 : a.branch.localeCompare(b.branch)));

const git = (args, cwd = REPO) => new Promise((resolve) => execFile('git', args, { cwd, windowsHide: true }, (e, out) => resolve(e ? '' : out.trim())));

async function worktrees() {
  const out = await git(['worktree', 'list', '--porcelain']);
  return out.split(/\n\n+/).map((block) => {
    const wt = (block.match(/^worktree (.+)$/m) ?? [])[1];
    const sha = (block.match(/^HEAD (\w+)$/m) ?? [])[1];
    const branch = (block.match(/^branch refs\/heads\/(.+)$/m) ?? [])[1];
    return wt && sha && branch ? { worktree: path.resolve(wt), sha, branch } : null;
  }).filter(Boolean);
}

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, windowsHide: true, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    const timer = setTimeout(() => child.kill(), 5 * 60e3);
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out: out.replace(/\x1b\[[0-9;]*m/g, '') }); });
    child.on('error', (e) => { clearTimeout(timer); resolve({ code: 1, out: String(e) }); });
  });
}

let chain = Promise.resolve(); // one build at a time
export function queueBuild(wt, { force = false } = {}) {
  const prev = builds.get(wt.branch);
  if (!force && prev && prev.sha === wt.sha && ['passed', 'failed', 'running', 'queued'].includes(prev.status)) return;
  builds.set(wt.branch, { ...(prev ?? {}), ...wt, status: 'queued' });
  broadcast({ type: 'builds', builds: listBuilds() });
  chain = chain.then(() => build(wt, prev)).catch(() => {});
}

async function build(wt, prev) {
  const started = Date.now();
  const subject = await git(['log', '-1', '--format=%s', wt.sha]);
  builds.set(wt.branch, { ...wt, subject, status: 'running', startedAt: new Date().toISOString() });
  broadcast({ type: 'builds', builds: listBuilds() });

  // The product is TestPal (plain JavaScript): syntax-check every file, then run its unit tests.
  const app = path.join(wt.worktree, 'testpal');
  const compile = fs.existsSync(app)
    ? await run(process.execPath, ['-e', CHECK_ALL], app)
    : { code: 1, out: 'There is no testpal/ folder on this branch.' };
  let status = compile.code === 0 ? 'passed' : 'failed', stage = compile.code === 0 ? 'tests' : 'compile';
  let tests = null, log = `$ node --check testpal/**/*.js\n${compile.out || '(no output)'}\n`;
  if (compile.code === 0) {
    const t = await run(process.execPath, [VITEST, 'run'], app);
    log += `\n$ vitest run\n${t.out}`;
    const passed = Number((t.out.match(/Tests\s+(?:.*?(\d+) failed.*?\|\s*)?(\d+) passed/) ?? [])[2] ?? 0);
    const failed = Number((t.out.match(/Tests\s+.*?(\d+) failed/) ?? [])[1] ?? 0);
    tests = { passed, failed };
    status = t.code === 0 ? 'passed' : 'failed';
  }
  const result = { ...wt, subject, status, stage, tests, duration: Math.round((Date.now() - started) / 1000), finishedAt: new Date().toISOString(), log: log.slice(-20000) };
  builds.set(wt.branch, result);
  persist();
  broadcast({ type: 'builds', builds: listBuilds() });

  const short = wt.sha.slice(0, 7);
  const what = status === 'passed'
    ? `✅ **${wt.branch}** passed · ${tests.passed} tests · \`${short}\` ${subject}`
    : stage === 'compile'
      ? `❌ **${wt.branch}** has syntax errors ·\`${short}\` ${subject}`
      : `❌ **${wt.branch}** failed · ${tests.failed} failing, ${tests.passed} passing · \`${short}\` ${subject}`;
  // Post failures, recoveries and first results; stay quiet when a passing branch keeps passing.
  if (status === 'failed' || !prev || prev.status !== 'passed') notify('sprint-1', `${what}\n\nDetails are in **Builds**.`, 'ci');
}

export async function poll({ force = false } = {}) {
  const wts = await worktrees();
  for (const wt of wts) queueBuild(wt, { force });
  for (const branch of builds.keys()) if (!wts.some((w) => w.branch === branch)) builds.delete(branch); // merged and removed
  persist();
  broadcast({ type: 'builds', builds: listBuilds() });
}
export async function rerun(branch) {
  const wt = (await worktrees()).find((w) => w.branch === branch);
  if (!wt) throw new Error(`No worktree for ${branch}.`);
  queueBuild(wt, { force: true });
}
export function startCI() {
  // A build left "running" by a restart starts again.
  for (const b of builds.values()) if (b.status === 'running' || b.status === 'queued') b.status = 'stale';
  poll();
  setInterval(() => poll(), POLL_MS);
}

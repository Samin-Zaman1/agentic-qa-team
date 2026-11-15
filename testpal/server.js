// TestPal's HTTP server: static files from public/ and the JSON API described in team/PRODUCT.md. Owner: Rafi.
//
//   node server.js                 http://localhost:4500
//   TESTPAL_PORT=4510 node server.js
//   TESTPAL_DATA=/some/file.json   use another data file

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.js';
import * as lists from './lib/checklists.js';
import { ChecklistError } from './lib/checklists.js';
import { summarize, toMarkdown } from './lib/report.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(here, 'public');
const MAX_BODY = 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new ChecklistError('That request is too big.', 413));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (text.trim() === '') return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new ChecklistError('The request body isn\'t valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'checklist';
}

/** Handles /api/... Returns true if it handled the request. */
async function handleApi(req, res, store, url) {
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent); // ['api', 'checklists', id, ...]
  if (parts[0] !== 'api') return false;
  if (parts[1] !== 'checklists' || parts.length > 5) {
    sendError(res, 404, 'There\'s no such API endpoint.');
    return true;
  }

  const [, , id, sub, caseId] = parts;
  const method = req.method;
  const data = store.load();
  const wrongMethod = () => sendError(res, 405, `${method} isn't supported on ${url.pathname}.`);

  // /api/checklists
  if (!id) {
    if (method === 'GET') {
      return sendJson(res, 200, data.checklists.map((c) => ({ id: c.id, name: c.name, createdAt: c.createdAt, counts: summarize(c) }))), true;
    }
    if (method === 'POST') {
      const checklist = lists.createChecklist(data, await readBody(req));
      store.save(data);
      return sendJson(res, 201, checklist), true;
    }
    return wrongMethod(), true;
  }

  // /api/checklists/:id
  if (!sub) {
    if (method === 'GET') return sendJson(res, 200, lists.getChecklist(data, id)), true;
    if (method === 'PATCH') {
      const checklist = lists.renameChecklist(data, id, await readBody(req));
      store.save(data);
      return sendJson(res, 200, checklist), true;
    }
    if (method === 'DELETE') {
      lists.deleteChecklist(data, id);
      store.save(data);
      return sendJson(res, 200, { ok: true }), true;
    }
    return wrongMethod(), true;
  }

  // /api/checklists/:id/summary
  if (sub === 'summary' && !caseId) {
    if (method !== 'GET') return wrongMethod(), true;
    return sendJson(res, 200, summarize(lists.getChecklist(data, id))), true;
  }

  // /api/checklists/:id/export.md
  if (sub === 'export.md' && !caseId) {
    if (method !== 'GET') return wrongMethod(), true;
    const checklist = lists.getChecklist(data, id);
    const md = toMarkdown(checklist);
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug(checklist.name)}.md"`,
      'Content-Length': Buffer.byteLength(md),
    });
    res.end(md);
    return true;
  }

  // /api/checklists/:id/cases[/:caseId]
  if (sub === 'cases') {
    if (!caseId) {
      if (method !== 'POST') return wrongMethod(), true;
      const testCase = lists.addCase(data, id, await readBody(req));
      store.save(data);
      return sendJson(res, 201, testCase), true;
    }
    if (method === 'PATCH') {
      const testCase = lists.updateCase(data, id, caseId, await readBody(req));
      store.save(data);
      return sendJson(res, 200, testCase), true;
    }
    if (method === 'DELETE') {
      lists.deleteCase(data, id, caseId);
      store.save(data);
      return sendJson(res, 200, { ok: true }), true;
    }
    return wrongMethod(), true;
  }

  sendError(res, 404, 'There\'s no such API endpoint.');
  return true;
}

function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendError(res, 405, 'Only GET works here.');
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(PUBLIC_DIR, '.' + rel);
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return sendError(res, 404, 'Not found.');
  fs.readFile(file, (err, content) => {
    if (err) return sendError(res, 404, 'Not found.');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
}

export function createServer(store = createStore()) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (await handleApi(req, res, store, url)) return;
      serveStatic(req, res, url);
    } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof ChecklistError) return sendError(res, e.status, e.message);
      if (e instanceof URIError) return sendError(res, 400, 'That address has a broken character in it.');
      console.error(e);
      sendError(res, 500, `Something went wrong on the server: ${e.message}`);
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.TESTPAL_PORT) || 4500;
  const store = createStore();
  createServer(store).listen(port, () => {
    console.log(`TestPal is running at http://localhost:${port}`);
    console.log(`Data file: ${store.file}`);
  });
}

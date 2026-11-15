import { describe, it, expect } from 'vitest';
import { summarize, toMarkdown } from '../lib/report.js';

const NOW = new Date('2026-11-11T09:30:00Z');

function tc(title, status = 'not-run', note = '') {
  return { id: title, title, steps: '', expected: '', status, note, updatedAt: '2026-11-11T09:00:00Z' };
}

function list(cases, name = 'Login page') {
  return { id: 'abc123abc123', name, createdAt: '2026-11-10T08:00:00Z', cases };
}

describe('summarize', () => {
  it('counts every status', () => {
    const s = summarize(list([
      tc('a', 'pass'), tc('b', 'pass'), tc('c', 'fail'), tc('d', 'blocked'), tc('e', 'not-run'),
    ]));
    expect(s).toEqual({ total: 5, pass: 2, fail: 1, blocked: 1, notRun: 1, passRate: 40 });
  });

  it('gives 0% and all zeros for an empty checklist (no NaN)', () => {
    expect(summarize(list([]))).toEqual({ total: 0, pass: 0, fail: 0, blocked: 0, notRun: 0, passRate: 0 });
  });

  it('handles a checklist with no cases array', () => {
    expect(summarize({ name: 'x' }).total).toBe(0);
  });

  it('rounds the pass rate to a whole number', () => {
    expect(summarize(list([tc('a', 'pass'), tc('b'), tc('c')])).passRate).toBe(33);
    expect(summarize(list([tc('a', 'pass'), tc('b', 'pass'), tc('c')])).passRate).toBe(67);
  });

  it('gives 100% when everything passed and 0% when nothing did', () => {
    expect(summarize(list([tc('a', 'pass'), tc('b', 'pass')])).passRate).toBe(100);
    expect(summarize(list([tc('a', 'blocked'), tc('b', 'not-run')])).passRate).toBe(0);
  });

  it('counts blocked and not-run in the total for the pass rate', () => {
    expect(summarize(list([tc('a', 'pass'), tc('b', 'blocked'), tc('c', 'not-run'), tc('d', 'fail')])).passRate).toBe(25);
  });

  it('treats a case with no status as not run', () => {
    expect(summarize(list([{ id: 'x', title: 'old case' }])).notRun).toBe(1);
  });

  it('does not change the checklist', () => {
    const c = list([tc('a', 'pass')]);
    const before = JSON.stringify(c);
    summarize(c);
    toMarkdown(c, { now: NOW });
    expect(JSON.stringify(c)).toBe(before);
  });
});

describe('toMarkdown', () => {
  it('exports the name, date, summary and a results table', () => {
    const md = toMarkdown(list([
      tc('Valid login', 'pass'),
      tc('Wrong password', 'fail', 'Shows a 500 page'),
      tc('Forgot password', 'blocked', 'Email server down'),
      tc('Remember me'),
    ]), { now: NOW });
    expect(md).toBe([
      '# Login page',
      '',
      'Exported 2026-11-11',
      '',
      '## Summary',
      '',
      '- Total: 4 test cases',
      '- Pass: 1',
      '- Fail: 1',
      '- Blocked: 1',
      '- Not run: 1',
      '- Pass rate: 25%',
      '',
      '## Test cases',
      '',
      '| # | Test case | Result | Note |',
      '|---|---|---|---|',
      '| 1 | Valid login | Pass | - |',
      '| 2 | Wrong password | Fail | Shows a 500 page |',
      '| 3 | Forgot password | Blocked | Email server down |',
      '| 4 | Remember me | Not run | - |',
      '',
    ].join('\n'));
  });

  it('says "1 test case", singular', () => {
    expect(toMarkdown(list([tc('only', 'pass')]), { now: NOW })).toContain('- Total: 1 test case\n');
  });

  it('exports an empty checklist with a message instead of an empty table', () => {
    const md = toMarkdown(list([]), { now: NOW });
    expect(md).toContain('- Total: 0 test cases');
    expect(md).toContain('- Pass rate: 0%');
    expect(md).toContain('No test cases yet.');
    expect(md).not.toContain('| # |');
  });

  it('keeps a multi-line note on one table row', () => {
    const md = toMarkdown(list([tc('Upload', 'fail', 'Line one\nLine two\r\n  Line three')]), { now: NOW });
    expect(md).toContain('| 1 | Upload | Fail | Line one Line two Line three |');
  });

  it("uses today's date when none is given", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(toMarkdown(list([]))).toContain(`Exported ${today}`);
  });

  it('ends with a single newline', () => {
    const md = toMarkdown(list([tc('a', 'pass')]), { now: NOW });
    expect(md.endsWith('|\n')).toBe(true);
  });
});

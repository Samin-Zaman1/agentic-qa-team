import { describe, it, expect } from 'vitest';
import {
  statusLabel, plural, countsLine, summaryItems, errorMessage, checklistIdFromHash, hashForChecklist,
} from '../public/ui.js';

function fakeResponse(status, body) {
  return {
    status,
    json: async () => {
      if (typeof body === 'string') throw new SyntaxError('not json');
      return body;
    },
  };
}

describe('statusLabel', () => {
  it('names every status', () => {
    expect(statusLabel('pass')).toBe('Pass');
    expect(statusLabel('fail')).toBe('Fail');
    expect(statusLabel('blocked')).toBe('Blocked');
    expect(statusLabel('not-run')).toBe('Not run');
  });
  it('falls back to Not run for anything unknown', () => {
    expect(statusLabel(undefined)).toBe('Not run');
  });
});

describe('plural and countsLine', () => {
  it('pluralizes', () => {
    expect(plural(1, 'test')).toBe('1 test');
    expect(plural(0, 'test')).toBe('0 tests');
    expect(plural(2, 'test')).toBe('2 tests');
  });
  it('says there are no tests for an empty checklist', () => {
    expect(countsLine({ total: 0, pass: 0, fail: 0, blocked: 0, notRun: 0, passRate: 0 })).toBe('No tests yet');
    expect(countsLine(undefined)).toBe('No tests yet');
  });
  it('shows total, how many ran and the pass rate', () => {
    expect(countsLine({ total: 4, pass: 1, fail: 1, blocked: 0, notRun: 2, passRate: 25 })).toBe('4 tests · 2 run · 25% passed');
  });
});

describe('summaryItems', () => {
  it('lists the counts in display order with the pass rate as a percentage', () => {
    const items = summaryItems({ total: 5, pass: 2, fail: 1, blocked: 1, notRun: 1, passRate: 40 });
    expect(items.map((i) => i.label)).toEqual(['Total', 'Pass', 'Fail', 'Blocked', 'Not run', 'Pass rate']);
    expect(items.map((i) => i.value)).toEqual([5, 2, 1, 1, 1, '40%']);
  });
});

describe('errorMessage', () => {
  it('uses the server message as is', async () => {
    expect(await errorMessage(fakeResponse(400, { error: 'Give the checklist a name.' }))).toBe('Give the checklist a name.');
  });
  it('falls back to a generic message when the body is not JSON or has no error', async () => {
    expect(await errorMessage(fakeResponse(502, 'Bad gateway'))).toBe('Something went wrong (HTTP 502). Try again.');
    expect(await errorMessage(fakeResponse(500, { error: '' }))).toBe('Something went wrong (HTTP 500). Try again.');
  });
});

describe('hash routing', () => {
  it('round-trips a checklist id', () => {
    expect(checklistIdFromHash(hashForChecklist('abc123'))).toBe('abc123');
  });
  it('returns null when no checklist is open', () => {
    expect(checklistIdFromHash('')).toBeNull();
    expect(checklistIdFromHash('#/')).toBeNull();
    expect(checklistIdFromHash(hashForChecklist(null))).toBeNull();
    expect(checklistIdFromHash('#/checklists/')).toBeNull();
  });
});

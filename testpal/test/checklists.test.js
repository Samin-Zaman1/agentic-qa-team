import { describe, it, expect, beforeEach } from 'vitest';
import {
  createChecklist, renameChecklist, deleteChecklist, getChecklist, listChecklists,
  addCase, updateCase, deleteCase, ChecklistError, STATUSES, LIMITS,
} from '../lib/checklists.js';
import { emptyData } from '../lib/store.js';

let data;
beforeEach(() => {
  data = emptyData();
});

function expectError(fn, status, pattern) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(ChecklistError);
    expect(e.status).toBe(status);
    if (pattern) expect(e.message).toMatch(pattern);
    return;
  }
  throw new Error('expected a ChecklistError');
}

describe('checklists', () => {
  it('creates a checklist with an id, trimmed name, timestamp and no cases', () => {
    const c = createChecklist(data, { name: '  Login page  ' });
    expect(c.id).toMatch(/^[0-9a-f]{12}$/);
    expect(c.name).toBe('Login page');
    expect(Number.isNaN(Date.parse(c.createdAt))).toBe(false);
    expect(c.cases).toEqual([]);
    expect(listChecklists(data)).toEqual([c]);
  });

  it('gives each checklist a different id', () => {
    const a = createChecklist(data, { name: 'A' });
    const b = createChecklist(data, { name: 'B' });
    expect(a.id).not.toBe(b.id);
  });

  it('rejects a missing, blank or non-text name', () => {
    expectError(() => createChecklist(data, {}), 400, /name/);
    expectError(() => createChecklist(data, { name: '   ' }), 400, /name/);
    expectError(() => createChecklist(data, { name: 42 }), 400, /name/);
    expect(data.checklists).toHaveLength(0);
  });

  it('rejects a name over the limit', () => {
    expectError(() => createChecklist(data, { name: 'x'.repeat(LIMITS.name + 1) }), 400, /at most/);
    expect(createChecklist(data, { name: 'x'.repeat(LIMITS.name) }).name).toHaveLength(LIMITS.name);
  });

  it('rejects a body that is not an object', () => {
    expectError(() => createChecklist(data, null), 400, /JSON object/);
    expectError(() => createChecklist(data, ['x']), 400, /JSON object/);
  });

  it('renames a checklist', () => {
    const c = createChecklist(data, { name: 'Old' });
    expect(renameChecklist(data, c.id, { name: ' New ' }).name).toBe('New');
    expect(getChecklist(data, c.id).name).toBe('New');
  });

  it('keeps the old name when a rename is invalid', () => {
    const c = createChecklist(data, { name: 'Old' });
    expectError(() => renameChecklist(data, c.id, { name: '' }), 400);
    expect(getChecklist(data, c.id).name).toBe('Old');
  });

  it('deletes a checklist', () => {
    const a = createChecklist(data, { name: 'A' });
    const b = createChecklist(data, { name: 'B' });
    deleteChecklist(data, a.id);
    expect(listChecklists(data)).toEqual([b]);
  });

  it('returns 404 for a checklist that does not exist', () => {
    expectError(() => getChecklist(data, 'nope'), 404, /doesn't exist/);
    expectError(() => renameChecklist(data, 'nope', { name: 'X' }), 404);
    expectError(() => deleteChecklist(data, 'nope'), 404);
  });
});

describe('test cases', () => {
  let list;
  beforeEach(() => {
    list = createChecklist(data, { name: 'Checkout' });
  });

  it('adds a case with defaults', () => {
    const t = addCase(data, list.id, { title: ' Pay with card ', steps: '1. Add item\n2. Pay', expected: 'Order placed' });
    expect(t).toMatchObject({ title: 'Pay with card', steps: '1. Add item\n2. Pay', expected: 'Order placed', status: 'not-run', note: '' });
    expect(t.id).toMatch(/^[0-9a-f]{12}$/);
    expect(Number.isNaN(Date.parse(t.updatedAt))).toBe(false);
    expect(getChecklist(data, list.id).cases).toEqual([t]);
  });

  it('treats missing steps and expected as empty', () => {
    const t = addCase(data, list.id, { title: 'Only a title' });
    expect(t.steps).toBe('');
    expect(t.expected).toBe('');
  });

  it('rejects a case without a title', () => {
    expectError(() => addCase(data, list.id, {}), 400, /title/);
    expectError(() => addCase(data, list.id, { title: '  ' }), 400, /title/);
    expect(getChecklist(data, list.id).cases).toHaveLength(0);
  });

  it('rejects non-text or too-long steps and expected', () => {
    expectError(() => addCase(data, list.id, { title: 'T', steps: 5 }), 400, /Steps must be text/);
    expectError(() => addCase(data, list.id, { title: 'T', expected: 'x'.repeat(LIMITS.expected + 1) }), 400, /at most/);
  });

  it('rejects adding a case to a missing checklist', () => {
    expectError(() => addCase(data, 'nope', { title: 'T' }), 404);
  });

  it('edits fields and bumps updatedAt', async () => {
    const t = addCase(data, list.id, { title: 'T' });
    const before = t.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    const edited = updateCase(data, list.id, t.id, { title: 'T2', steps: 'S', expected: 'E' });
    expect(edited).toMatchObject({ title: 'T2', steps: 'S', expected: 'E', status: 'not-run' });
    expect(edited.updatedAt > before).toBe(true);
  });

  it('records each status with a note', () => {
    const t = addCase(data, list.id, { title: 'T' });
    for (const status of STATUSES) {
      expect(updateCase(data, list.id, t.id, { status, note: `was ${status}` })).toMatchObject({ status, note: `was ${status}` });
    }
  });

  it('rejects an unknown status and changes nothing', () => {
    const t = addCase(data, list.id, { title: 'T' });
    expectError(() => updateCase(data, list.id, t.id, { status: 'passed', note: 'x' }), 400, /pass, fail, blocked, not-run/);
    expect(t.status).toBe('not-run');
    expect(t.note).toBe('');
  });

  it('rejects an empty edit', () => {
    const t = addCase(data, list.id, { title: 'T' });
    expectError(() => updateCase(data, list.id, t.id, {}), 400, /Nothing to change/);
  });

  it('rejects clearing the title', () => {
    const t = addCase(data, list.id, { title: 'T' });
    expectError(() => updateCase(data, list.id, t.id, { title: '' }), 400, /title/);
    expect(t.title).toBe('T');
  });

  it('returns 404 for a case that does not exist', () => {
    expectError(() => updateCase(data, list.id, 'nope', { status: 'pass' }), 404, /test case/);
    expectError(() => deleteCase(data, list.id, 'nope'), 404);
  });

  it('deletes a case', () => {
    const a = addCase(data, list.id, { title: 'A' });
    const b = addCase(data, list.id, { title: 'B' });
    deleteCase(data, list.id, a.id);
    expect(getChecklist(data, list.id).cases).toEqual([b]);
  });
});

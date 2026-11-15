// Checklists, test cases, results and validation. Owner: Rafi.
//
// Every function takes the whole data object ({ checklists: [...] }), changes it in place, and returns the
// thing it created or changed. Saving is the caller's job (server.js). Bad input throws a ChecklistError
// with an HTTP status and a message written for a person, so the server can pass it straight through.

import crypto from 'node:crypto';

export const STATUSES = ['pass', 'fail', 'blocked', 'not-run'];
export const LIMITS = { name: 100, title: 200, steps: 5000, expected: 2000, note: 2000 };

export class ChecklistError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ChecklistError';
    this.status = status;
  }
}

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function now() {
  return new Date().toISOString();
}

function cleanName(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new ChecklistError('Give the checklist a name.');
  }
  const trimmed = name.trim();
  if (trimmed.length > LIMITS.name) {
    throw new ChecklistError(`Checklist names can be at most ${LIMITS.name} characters.`);
  }
  return trimmed;
}

function cleanTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new ChecklistError('A test case needs a title.');
  }
  const trimmed = title.trim();
  if (trimmed.length > LIMITS.title) {
    throw new ChecklistError(`Test case titles can be at most ${LIMITS.title} characters.`);
  }
  return trimmed;
}

/** Optional text fields (steps, expected, note): missing or null means empty. */
function cleanText(value, field, label) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new ChecklistError(`${label} must be text.`);
  }
  if (value.length > LIMITS[field]) {
    throw new ChecklistError(`${label} can be at most ${LIMITS[field]} characters.`);
  }
  return value.trim();
}

function cleanStatus(status) {
  if (!STATUSES.includes(status)) {
    throw new ChecklistError(`Status must be one of: ${STATUSES.join(', ')}.`);
  }
  return status;
}

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ChecklistError('Send the details as a JSON object.');
  }
  return body;
}

// ---- Checklists ----

export function listChecklists(data) {
  return data.checklists;
}

export function getChecklist(data, id) {
  const checklist = data.checklists.find((c) => c.id === id);
  if (!checklist) throw new ChecklistError('That checklist doesn\'t exist. It may have been deleted.', 404);
  return checklist;
}

export function createChecklist(data, body) {
  const { name } = requireObject(body);
  const checklist = { id: newId(), name: cleanName(name), createdAt: now(), cases: [] };
  data.checklists.push(checklist);
  return checklist;
}

export function renameChecklist(data, id, body) {
  const { name } = requireObject(body);
  const checklist = getChecklist(data, id);
  checklist.name = cleanName(name);
  return checklist;
}

export function deleteChecklist(data, id) {
  const checklist = getChecklist(data, id);
  data.checklists = data.checklists.filter((c) => c !== checklist);
  return checklist;
}

// ---- Test cases ----

export function getCase(checklist, caseId) {
  const testCase = checklist.cases.find((c) => c.id === caseId);
  if (!testCase) throw new ChecklistError('That test case doesn\'t exist. It may have been deleted.', 404);
  return testCase;
}

export function addCase(data, checklistId, body) {
  requireObject(body);
  const checklist = getChecklist(data, checklistId);
  const testCase = {
    id: newId(),
    title: cleanTitle(body.title),
    steps: cleanText(body.steps, 'steps', 'Steps'),
    expected: cleanText(body.expected, 'expected', 'Expected result'),
    status: 'not-run',
    note: '',
    updatedAt: now(),
  };
  checklist.cases.push(testCase);
  return testCase;
}

/** Edits any of title, steps, expected, status, note. Validates everything before changing anything. */
export function updateCase(data, checklistId, caseId, body) {
  requireObject(body);
  const checklist = getChecklist(data, checklistId);
  const testCase = getCase(checklist, caseId);

  const changes = {};
  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title === '') {
      throw new ChecklistError('A test case needs a title.');
    }
    if (body.title.length > LIMITS.title) {
      throw new ChecklistError(`Test case titles can be at most ${LIMITS.title} characters.`);
    }
    changes.title = body.title.trim();
  }
  if ('steps' in body) changes.steps = cleanText(body.steps, 'steps', 'Steps');
  if ('expected' in body) changes.expected = cleanText(body.expected, 'expected', 'Expected result');
  if ('status' in body) changes.status = cleanStatus(body.status);
  if ('note' in body) changes.note = cleanText(body.note, 'note', 'Note');

  if (Object.keys(changes).length === 0) {
    throw new ChecklistError('Nothing to change. Send a title, steps, expected, status or note.');
  }

  Object.assign(testCase, changes, { updatedAt: now() });
  return testCase;
}

export function deleteCase(data, checklistId, caseId) {
  const checklist = getChecklist(data, checklistId);
  const testCase = getCase(checklist, caseId);
  checklist.cases = checklist.cases.filter((c) => c !== testCase);
  return testCase;
}

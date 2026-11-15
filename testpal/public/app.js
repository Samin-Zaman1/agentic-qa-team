// TestPal's web page. Plain DOM, no framework. Talks to the JSON API in server.js. Owner: Mei.
//
// All user text goes into the page with textContent (never innerHTML), so names and titles show as typed.

import {
  STATUS_ORDER, statusLabel, countsLine, summaryItems, errorMessage, OFFLINE_MESSAGE,
  checklistIdFromHash, hashForChecklist,
} from './ui.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  checklists: [],
  open: null,      // the open checklist, with cases
  summary: null,
  editingCaseId: null,
};

// ---- API ----

async function api(method, path, body) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(OFFLINE_MESSAGE);
  }
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json();
}

// ---- Messages ----

let messageTimer = null;

function showMessage(text, kind = 'error') {
  const box = $('#message');
  box.textContent = text;
  box.className = `message ${kind}`;
  box.hidden = false;
  clearTimeout(messageTimer);
  if (kind !== 'error') messageTimer = setTimeout(() => { box.hidden = true; }, 2500);
}

function clearMessage() {
  $('#message').hidden = true;
}

/** Runs an action, disables the button while it's in flight (no double submits), and shows any error. */
async function run(button, action) {
  if (button) button.disabled = true;
  try {
    clearMessage();
    await action();
  } catch (e) {
    showMessage(e.message);
  } finally {
    if (button) button.disabled = false;
  }
}

// ---- DOM helper ----

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// ---- Loading ----

async function loadChecklists() {
  state.checklists = await api('GET', '/api/checklists');
  renderChecklists();
}

async function loadOpen() {
  const id = checklistIdFromHash(location.hash);
  if (!id) {
    state.open = null;
    state.summary = null;
    renderOpen();
    return;
  }
  try {
    const [checklist, summary] = await Promise.all([
      api('GET', `/api/checklists/${encodeURIComponent(id)}`),
      api('GET', `/api/checklists/${encodeURIComponent(id)}/summary`),
    ]);
    state.open = checklist;
    state.summary = summary;
  } catch (e) {
    state.open = null;
    state.summary = null;
    showMessage(e.message);
  }
  renderOpen();
  renderChecklists();
}

function openChecklist(id) {
  state.editingCaseId = null;
  location.hash = hashForChecklist(id); // hashchange loads it
}

// ---- Checklist list (left column) ----

function renderChecklists() {
  const list = $('#checklists');
  list.replaceChildren();
  if (state.checklists.length === 0) {
    list.append(el('li', { class: 'empty', text: 'No checklists yet. Create your first one above.' }));
    return;
  }
  const openId = state.open && state.open.id;
  for (const c of state.checklists) {
    list.append(el('li', {},
      el('button', {
        type: 'button',
        class: `checklist-link${c.id === openId ? ' active' : ''}`,
        'aria-current': c.id === openId ? 'true' : null,
        onclick: () => openChecklist(c.id),
      },
      el('span', { class: 'checklist-name', text: c.name }),
      el('span', { class: 'checklist-counts', text: countsLine(c.counts) })),
    ));
  }
}

async function createChecklist(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.elements.name;
  await run(form.querySelector('button[type=submit]'), async () => {
    const created = await api('POST', '/api/checklists', { name: input.value });
    input.value = '';
    await loadChecklists();
    openChecklist(created.id);
  });
}

// ---- Open checklist (main area) ----

function renderOpen() {
  const main = $('#open');
  main.replaceChildren();
  const c = state.open;
  if (!c) {
    main.append(el('div', { class: 'placeholder' },
      el('h2', { text: 'Pick a checklist' }),
      el('p', { text: state.checklists.length
        ? 'Choose a checklist on the left to see its test cases.'
        : 'Create a checklist on the left, then add your test cases to it.' })));
    return;
  }

  main.append(
    el('header', { class: 'open-header' },
      el('h2', { id: 'open-name', text: c.name }),
      el('div', { class: 'actions' },
        el('a', { class: 'button', href: `/api/checklists/${encodeURIComponent(c.id)}/export.md`, download: true, text: 'Export markdown' }),
        el('button', { type: 'button', onclick: startRename, text: 'Rename' }),
        el('button', { type: 'button', class: 'danger', onclick: (e) => deleteChecklist(e.currentTarget), text: 'Delete' }))),
    renderSummary(),
    renderAddCase(),
    renderCases(),
  );
}

function renderSummary() {
  if (!state.summary) return null;
  return el('section', { class: 'summary', 'aria-label': 'Summary' },
    summaryItems(state.summary).map((item) =>
      el('div', { class: `stat stat-${item.key}` },
        el('span', { class: 'stat-value', text: item.value }),
        el('span', { class: 'stat-label', text: item.label }))));
}

function startRename() {
  const c = state.open;
  const heading = $('#open-name');
  const input = el('input', { name: 'name', value: c.name, maxlength: 100, 'aria-label': 'Checklist name', required: true });
  const form = el('form', { class: 'rename-form', onsubmit: (e) => renameChecklist(e) },
    input,
    el('button', { type: 'submit', class: 'primary', text: 'Save' }),
    el('button', { type: 'button', onclick: () => renderOpen(), text: 'Cancel' }));
  heading.replaceWith(form);
  input.focus();
  input.select();
}

async function renameChecklist(event) {
  event.preventDefault();
  const form = event.currentTarget;
  await run(form.querySelector('button[type=submit]'), async () => {
    const updated = await api('PATCH', `/api/checklists/${encodeURIComponent(state.open.id)}`, { name: form.elements.name.value });
    state.open.name = updated.name;
    renderOpen();
    await loadChecklists();
    showMessage('Checklist renamed.', 'ok');
  });
}

async function deleteChecklist(button) {
  const c = state.open;
  const n = c.cases.length;
  const what = n ? ` and its ${n === 1 ? 'test case' : `${n} test cases`}` : '';
  if (!confirm(`Delete "${c.name}"${what}? This can't be undone.`)) return;
  await run(button, async () => {
    await api('DELETE', `/api/checklists/${encodeURIComponent(c.id)}`);
    state.open = null;
    state.summary = null;
    location.hash = hashForChecklist(null);
    await loadChecklists();
    renderOpen();
    showMessage('Checklist deleted.', 'ok');
  });
}

// ---- Test cases ----

function caseFields(values = {}) {
  return [
    el('label', {}, 'Title',
      el('input', { name: 'title', value: values.title || '', maxlength: 200, required: true, placeholder: 'e.g. Log in with a valid password' })),
    el('label', {}, 'Steps (optional)',
      el('textarea', { name: 'steps', rows: 3, maxlength: 5000, placeholder: '1. Open the login page\n2. ...' }, values.steps || '')),
    el('label', {}, 'Expected result (optional)',
      el('textarea', { name: 'expected', rows: 2, maxlength: 2000 }, values.expected || '')),
  ];
}

function readCaseForm(form) {
  return {
    title: form.elements.title.value,
    steps: form.elements.steps.value,
    expected: form.elements.expected.value,
  };
}

function renderAddCase() {
  return el('details', { class: 'add-case', open: state.open.cases.length === 0 },
    el('summary', { text: 'Add a test case' }),
    el('form', { onsubmit: addCase },
      caseFields(),
      el('div', { class: 'actions' }, el('button', { type: 'submit', class: 'primary', text: 'Add test case' }))));
}

async function addCase(event) {
  event.preventDefault();
  const form = event.currentTarget;
  await run(form.querySelector('button[type=submit]'), async () => {
    await api('POST', `/api/checklists/${encodeURIComponent(state.open.id)}/cases`, readCaseForm(form));
    form.reset();
    await loadOpen();
    const again = document.querySelector('.add-case');
    if (again) {
      again.open = true;
      again.querySelector('input[name=title]').focus();
    }
    showMessage('Test case added.', 'ok');
  });
}

function renderCases() {
  const cases = state.open.cases;
  if (cases.length === 0) {
    return el('p', { class: 'empty', text: 'No test cases in this checklist yet.' });
  }
  return el('ol', { class: 'cases' }, cases.map((tc) =>
    tc.id === state.editingCaseId ? renderEditCase(tc) : renderCase(tc)));
}

function renderCase(tc) {
  const noteInput = el('textarea', { name: 'note', rows: 1, maxlength: 2000, placeholder: 'Note (optional): what you saw, a bug ID…', 'aria-label': `Note for ${tc.title}` }, tc.note || '');
  return el('li', { class: `case status-${tc.status}` },
    el('div', { class: 'case-head' },
      el('h3', { text: tc.title }),
      el('span', { class: `badge badge-${tc.status}`, text: statusLabel(tc.status) })),
    tc.steps ? el('div', { class: 'case-field' }, el('strong', { text: 'Steps' }), el('p', { class: 'pre', text: tc.steps })) : null,
    tc.expected ? el('div', { class: 'case-field' }, el('strong', { text: 'Expected' }), el('p', { class: 'pre', text: tc.expected })) : null,
    el('div', { class: 'result' },
      el('div', { class: 'status-buttons', role: 'group', 'aria-label': `Result for ${tc.title}` },
        STATUS_ORDER.map((s) => el('button', {
          type: 'button',
          class: `status-btn status-btn-${s}${tc.status === s ? ' selected' : ''}`,
          'aria-pressed': tc.status === s ? 'true' : 'false',
          onclick: (e) => setResult(e.currentTarget, tc, { status: s, note: noteInput.value }),
          text: statusLabel(s),
        }))),
      noteInput,
      el('button', { type: 'button', onclick: (e) => setResult(e.currentTarget, tc, { note: noteInput.value }), text: 'Save note' })),
    el('div', { class: 'case-actions' },
      el('button', { type: 'button', class: 'link', onclick: () => { state.editingCaseId = tc.id; renderOpen(); }, text: 'Edit' }),
      el('button', { type: 'button', class: 'link danger', onclick: (e) => deleteCase(e.currentTarget, tc), text: 'Delete' })));
}

function renderEditCase(tc) {
  return el('li', { class: 'case editing' },
    el('form', { onsubmit: (e) => saveCase(e, tc) },
      caseFields(tc),
      el('div', { class: 'actions' },
        el('button', { type: 'submit', class: 'primary', text: 'Save changes' }),
        el('button', { type: 'button', onclick: () => { state.editingCaseId = null; renderOpen(); }, text: 'Cancel' }))));
}

async function saveCase(event, tc) {
  event.preventDefault();
  const form = event.currentTarget;
  await run(form.querySelector('button[type=submit]'), async () => {
    await api('PATCH', `/api/checklists/${encodeURIComponent(state.open.id)}/cases/${encodeURIComponent(tc.id)}`, readCaseForm(form));
    state.editingCaseId = null;
    await loadOpen();
    showMessage('Test case saved.', 'ok');
  });
}

async function setResult(button, tc, changes) {
  await run(button, async () => {
    await api('PATCH', `/api/checklists/${encodeURIComponent(state.open.id)}/cases/${encodeURIComponent(tc.id)}`, changes);
    await loadOpen();
    if (!('status' in changes)) showMessage('Note saved.', 'ok');
  });
}

async function deleteCase(button, tc) {
  if (!confirm(`Delete the test case "${tc.title}"? This can't be undone.`)) return;
  await run(button, async () => {
    await api('DELETE', `/api/checklists/${encodeURIComponent(state.open.id)}/cases/${encodeURIComponent(tc.id)}`);
    if (state.editingCaseId === tc.id) state.editingCaseId = null;
    await loadOpen();
    showMessage('Test case deleted.', 'ok');
  });
}

// ---- Start ----

$('#new-checklist').addEventListener('submit', createChecklist);
window.addEventListener('hashchange', () => run(null, loadOpen));

run(null, async () => {
  await loadChecklists();
  await loadOpen();
});

// Small pieces of page logic that don't need a browser, so they can be unit tested. Owner: Mei.

export const STATUS_LABELS = { pass: 'Pass', fail: 'Fail', blocked: 'Blocked', 'not-run': 'Not run' };
export const STATUS_ORDER = ['pass', 'fail', 'blocked', 'not-run'];

export function statusLabel(status) {
  return STATUS_LABELS[status] || 'Not run';
}

/** "1 test" / "3 tests" */
export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** One line for the checklist list, from the `counts` the API sends with each checklist. */
export function countsLine(counts) {
  if (!counts || !counts.total) return 'No tests yet';
  const ran = counts.total - counts.notRun;
  return `${plural(counts.total, 'test')} · ${ran} run · ${counts.passRate}% passed`;
}

/** The summary items shown above the test cases, in display order. */
export function summaryItems(summary) {
  return [
    { key: 'total', label: 'Total', value: summary.total },
    { key: 'pass', label: 'Pass', value: summary.pass },
    { key: 'fail', label: 'Fail', value: summary.fail },
    { key: 'blocked', label: 'Blocked', value: summary.blocked },
    { key: 'not-run', label: 'Not run', value: summary.notRun },
    { key: 'rate', label: 'Pass rate', value: `${summary.passRate}%` },
  ];
}

/** Turns a failed fetch Response into a message for a person. Prefers the server's own `{ error }`. */
export async function errorMessage(response) {
  let body = null;
  try {
    body = await response.json();
  } catch {
    // not JSON: fall through to a generic message
  }
  if (body && typeof body.error === 'string' && body.error.trim() !== '') return body.error;
  return `Something went wrong (HTTP ${response.status}). Try again.`;
}

export const OFFLINE_MESSAGE = 'Can\'t reach the TestPal server. Is it still running?';

/** Reads the open checklist id from a location hash like "#/checklists/abc123". */
export function checklistIdFromHash(hash) {
  const m = /^#\/checklists\/([^/]+)$/.exec(hash || '');
  return m ? decodeURIComponent(m[1]) : null;
}

export function hashForChecklist(id) {
  return id ? `#/checklists/${encodeURIComponent(id)}` : '#/';
}

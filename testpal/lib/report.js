// Summary counts, the pass rate and the markdown export. Owner: Jonas.
//
// server.js calls summarize() for the list and summary routes and toMarkdown() for export.md.
// Both only read the checklist; they never change it.

const STATUS_LABELS = {
  pass: 'Pass',
  fail: 'Fail',
  blocked: 'Blocked',
  'not-run': 'Not run',
};

/** @returns {{ total: number, pass: number, fail: number, blocked: number, notRun: number, passRate: number }} */
export function summarize(checklist) {
  const cases = (checklist && checklist.cases) || [];
  const counts = { pass: 0, fail: 0, blocked: 0, notRun: 0 };
  for (const c of cases) {
    if (c.status === 'pass') counts.pass++;
    else if (c.status === 'fail') counts.fail++;
    else if (c.status === 'blocked') counts.blocked++;
    else counts.notRun++; // 'not-run', or a case saved before it had a status
  }
  const total = cases.length;
  return {
    total,
    ...counts,
    // passed ÷ total as a whole-number percentage (PRODUCT.md). No cases means 0%, not NaN.
    passRate: total === 0 ? 0 : Math.round((counts.pass / total) * 100),
  };
}

/** One line of text that is safe inside a table cell: no line breaks. */
function cell(text) {
  const value = String(text ?? '').replace(/\s*\r?\n\s*/g, ' ').trim();
  return value === '' ? '-' : value;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * The checklist as markdown someone can paste into a ticket: name, export date, summary and a results table.
 * `options.now` is only for tests (a fixed date).
 * @returns {string} markdown
 */
export function toMarkdown(checklist, options = {}) {
  const now = options.now || new Date();
  const s = summarize(checklist);
  const cases = checklist.cases || [];

  const lines = [
    `# ${cell(checklist.name)}`,
    '',
    `Exported ${isoDate(now)}`,
    '',
    '## Summary',
    '',
    `- Total: ${plural(s.total, 'test case')}`,
    `- Pass: ${s.pass}`,
    `- Fail: ${s.fail}`,
    `- Blocked: ${s.blocked}`,
    `- Not run: ${s.notRun}`,
    `- Pass rate: ${s.passRate}%`,
    '',
    '## Test cases',
    '',
  ];

  if (cases.length === 0) {
    lines.push('No test cases yet.');
  } else {
    lines.push('| # | Test case | Result | Note |', '|---|---|---|---|');
    cases.forEach((c, i) => {
      const result = STATUS_LABELS[c.status] || STATUS_LABELS['not-run'];
      lines.push(`| ${i + 1} | ${cell(c.title)} | ${result} | ${cell(c.note)} |`);
    });
  }

  return lines.join('\n') + '\n';
}

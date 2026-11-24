// The prompt gives critical_issues / important_issues / quick_wins no item shape, so Claude
// returns plain strings or objects with varying keys (finding, issue, win, action...).
// One helper for the web report and the PDF so both show the same text.
const TEXT_KEYS = ['finding', 'issue', 'title', 'win', 'quick_win', 'action', 'fix', 'description', 'text', 'summary'];

function issueText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return String(item ?? '');
  for (const k of TEXT_KEYS) if (typeof item[k] === 'string' && item[k].trim()) return item[k];
  const firstText = Object.values(item).find((v) => typeof v === 'string' && v.trim().length > 15);
  return firstText || JSON.stringify(item);
}

module.exports = { issueText };

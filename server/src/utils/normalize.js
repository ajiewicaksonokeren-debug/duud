export function normalizeAnswer(str) {
  return String(str || '')
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

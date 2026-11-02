// Make user-submitted text safe to drop into HTML built with template strings.
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Only allow http(s) links for user-supplied URLs (blocks javascript: and similar).
export function safeUrl(url) {
  return /^https?:\/\//i.test(String(url || '')) ? esc(url) : ''
}

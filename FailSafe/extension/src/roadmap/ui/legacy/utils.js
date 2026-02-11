export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}

export function profileRank(profile) {
  if (profile === 'expert') return 2;
  if (profile === 'standard') return 1;
  return 0;
}

export function capitalize(value) {
  const text = String(value || '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

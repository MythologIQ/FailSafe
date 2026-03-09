// FailSafe Command Center — Skill Utilities
// Extracted utilities for skill rendering and tag handling.

/** Escape HTML entities for safe innerHTML insertion. */
export function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/** Convert a tag slug to display format (e.g., "foo-bar" -> "Foo Bar"). */
export function displayTag(tag) {
  return String(tag || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Extract normalized tags from a skill object. */
export function skillTags(skill) {
  const tags = Array.isArray(skill?.tags) ? skill.tags : [];
  const fallback = skill?.category ? [skill.category] : [];
  return Array.from(new Set([...tags, ...fallback]
    .map(v => String(v || '').trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(v => v && v !== 'general')));
}

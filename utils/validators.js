// Shared input-sanitization helpers used by the login, register, and setup forms.

// Strip everything except Unicode letters, digits, and underscore.
function sanitizeUsername(raw) {
  return String(raw).replace(/[^\p{L}\p{N}_]/gu, '');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(email) {
  return EMAIL_RE.test(email);
}

// Clamp the configurable chat history size; a value of 0 would otherwise wipe
// the entire history in the cleanup query, so the floor is 10.
function clampChatLimit(raw) {
  return Math.min(Math.max(parseInt(raw) || 200, 10), 1000);
}

module.exports = { sanitizeUsername, isValidEmail, clampChatLimit };

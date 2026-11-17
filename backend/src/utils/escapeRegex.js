/**
 * Escapes RegExp special characters so user input is matched literally
 * (prevents invalid-pattern crashes and ReDoS via crafted search strings).
 */
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = escapeRegex;

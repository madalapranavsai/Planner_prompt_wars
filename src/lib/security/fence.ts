/**
 * Defense-in-depth prompt fencing to prevent prompt injection from untrusted user inputs.
 * Strips null bytes / control characters, escapes delimiter collisions, and wraps with clear data boundaries.
 */
export function wrapUntrusted(label: string, text: string, maxLength = 2000): string {
  if (!text) return "";

  // 1. Strip null bytes & harmful non-printable control characters (keep standard newlines and tabs)
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Cap maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  const safeLabel = label.toUpperCase().replace(/[^A-Z0-9_]/g, "_");

  // 3. Prevent delimiter spoofing
  sanitized = sanitized.replaceAll(`</${safeLabel}>`, `[ESCAPED_CLOSE_${safeLabel}]`);

  // 4. Return fenced string with passive data instruction
  return `<${safeLabel}>\n${sanitized}\n</${safeLabel}>`;
}

export function fenceUntrustedInput(text: string, maxLength = 1000): string {
  return wrapUntrusted("UNTRUSTED_USER_INPUT", text, maxLength);
}

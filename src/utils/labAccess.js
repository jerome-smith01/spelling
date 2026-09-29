/**
 * Temporary allowlist for the Phase 7 voice-comparison LAB tab (see
 * docs/architecture/06_tts_decision.md). Client-side hide only — the real gate is the
 * matching LAB_EMAILS check on the API (apps/spelling-tutor-api/src/index.ts). Meant to be
 * removed once Phase 7's decision is made.
 */
export const LAB_EMAILS = ['jerome7smith@gmail.com', 'heyrromey@gmail.com', 'goodplusfast@gmail.com'];

export function canAccessLab(user) {
  return !!user?.email && LAB_EMAILS.includes(user.email.toLowerCase());
}

// Temporary (1-2 day) allow-list for the TTS voice-comparison lab page.
// Client-side only — a simple hide, not a security boundary. The real gate is
// the API's own LAB_EMAILS check in apps/spelling-tutor-api/src/index.ts.
const LAB_EMAILS = ['jerome7smith@gmail.com', 'heyrromey@gmail.com', 'goodplusfast@gmail.com'];

export function isLabUser(email) {
  return !!email && LAB_EMAILS.includes(email.toLowerCase());
}

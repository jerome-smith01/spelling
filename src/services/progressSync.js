/**
 * Stage progress for assigned lists. An assignment is done when every word has passed every stage
 * (the Harvey ball is full), and the stages live in the learner's browser, so for a list that is
 * assigned to them the app reports each word's stage to the server. The server only moves a word
 * forward, so pushing is always safe, and a second device can carry on from the stored stages.
 */
import { apiFetch } from './apiService';

/** { words: { cat: { level, mastered } } } as stored on the server. */
export const fetchStages = (listId) => apiFetch(`/api/spelling/progress/${encodeURIComponent(listId)}`);

export const pushStages = (listId, words) =>
  apiFetch(`/api/spelling/progress/${encodeURIComponent(listId)}`, { method: 'PUT', body: { words } });

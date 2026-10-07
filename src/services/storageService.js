/**
 * Local persistence for word lists (schema v5).
 *
 * The UI always reads and writes localStorage; cloud sync (syncService) runs in
 * the background. A list's `id` is a client-generated UUID that is also its
 * server primary key, so a list's URL is identical on every device.
 *
 * List shape:
 *   { id, name, wordsRaw, isDefault, updatedAt (ISO), dirty, deleted,
 *     focusGroups: string[] (smart hiding), hints: string[] (lesson hints) }
 *
 * The built-in default list is virtual (id "default"): it is never stored or
 * synced until the user edits it, at which point it becomes a real list.
 */
import { DEFAULT_RAW_WORDS } from '../utils/wordParser';
import { parseFocusGroups } from '../utils/smartHide';

export const DEFAULT_LIST_ID = 'default';
export const LISTS_KEY = 'spelling_tutor_lists_v5';
export const LAST_LIST_KEY = 'spelling_tutor_last_list_v1';

const LEGACY_KEYS = ['spelling_tutor_words_v4', 'spelling_tutor_words_v3', 'spelling_tutor_words_v2'];
const OLD_DEFAULT_V2 = 'lov-ing\njoy-ful\npret-ty\nhand-some\nkit-ten\npup-py';

export const MAX_LISTS = 25;
export const MAX_WORDS_RAW_BYTES = 20 * 1024;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function newListId() {
  return crypto.randomUUID();
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode / quota): the app keeps working in memory
  }
}

/**
 * Pick the legacy single-list text (v4 > v3 > v2), normalising known old defaults.
 * Returns null when there is nothing custom worth migrating.
 */
export function legacyWordsToMigrate(read = safeGet) {
  for (const key of LEGACY_KEYS) {
    const raw = read(key);
    if (!raw || !raw.trim()) continue;
    let text = raw;
    if (key.endsWith('_v3')) {
      text = text.replace(/hand-some\s*\(\s*han-sum\s*\)/g, 'hand-some (hand-sum)');
    }
    const trimmed = text.trim();
    if (trimmed === DEFAULT_RAW_WORDS.trim() || trimmed === OLD_DEFAULT_V2) return null;
    return trimmed;
  }
  return null;
}

/** Build the initial v5 lists array from any legacy data. */
export function migrateLegacy(read = safeGet, now = () => new Date().toISOString(), makeId = newListId) {
  const legacy = legacyWordsToMigrate(read);
  if (!legacy) return [];
  return [
    {
      id: makeId(),
      name: 'My Words',
      wordsRaw: legacy,
      isDefault: 0,
      updatedAt: now(),
      dirty: true,
      deleted: false
    }
  ];
}

export const MAX_HINTS = 5;
export const MAX_HINT_LENGTH = 200;

/** Lesson hints: plain strings only, trimmed and length-clamped (always rendered as text). */
export function sanitizeHints(hints) {
  if (!Array.isArray(hints)) return [];
  return hints
    .filter(h => typeof h === 'string' && h.trim())
    .map(h => h.trim().slice(0, MAX_HINT_LENGTH))
    .slice(0, MAX_HINTS);
}

function sanitizeList(l) {
  if (!l || !isUuid(l.id) || typeof l.wordsRaw !== 'string') return null;
  return {
    id: l.id,
    name: typeof l.name === 'string' && l.name.trim() ? l.name.trim().slice(0, 100) : 'Untitled list',
    wordsRaw: l.wordsRaw,
    isDefault: l.isDefault ? 1 : 0,
    updatedAt: typeof l.updatedAt === 'string' ? l.updatedAt : new Date().toISOString(),
    dirty: Boolean(l.dirty),
    deleted: Boolean(l.deleted),
    focusGroups: parseFocusGroups(l.focusGroups),
    hints: sanitizeHints(l.hints)
  };
}

export function loadLists() {
  const stored = safeGet(LISTS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.map(sanitizeList).filter(Boolean);
    } catch {
      // fall through to migration
    }
  }
  const migrated = migrateLegacy();
  if (migrated.length) saveLists(migrated);
  return migrated;
}

export function saveLists(lists) {
  safeSet(LISTS_KEY, JSON.stringify(lists));
}

export function loadLastListId() {
  return safeGet(LAST_LIST_KEY);
}

export function saveLastListId(id) {
  safeSet(LAST_LIST_KEY, id);
}

/** Lists the user can see (excludes tombstones awaiting remote delete). */
export const visibleLists = (lists) => lists.filter(l => !l.deleted);

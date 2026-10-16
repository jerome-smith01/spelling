/**
 * When a child rushes past a mistake, and how firmly the app asks them to look at it.
 * (Behavior and the rules behind it: docs/architecture/07_quiz_and_keyboard.md §9.)
 *
 * A strike is "missed a word, then left its result in under RUSH_MS". Strikes are counted across the
 * whole round or session (not per word); a new round or session starts clean, to stay gentle.
 */
export const RUSH_MS = 1000;
export const MAX_LEVEL = 3;

/** Left the result too fast to have read it. */
export const isRushed = (dwellMs) => dwellMs < RUSH_MS;

/** 1 = informational popup, 2 = tap the wrong letter, 3 = fix it by typing. */
export const levelFor = (strikes) => Math.max(1, Math.min(MAX_LEVEL, strikes));

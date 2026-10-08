import React from 'react';

export const MIN_WORD_ROWS = 5;

/** Rows for a word list: at least 5, and always one blank line below the last word. */
export const wordRows = (value) => Math.max(MIN_WORD_ROWS, String(value ?? '').split('\n').length + 1);

/** A textarea that grows with the word list, so there is nothing to scroll. */
export default function WordsTextarea({ value, style, ...rest }) {
  return <textarea {...rest} value={value} rows={wordRows(value)} style={{ ...style, overflowY: 'hidden' }} />;
}

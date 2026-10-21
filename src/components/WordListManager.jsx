import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_LIST_ID } from '../services/storageService';

const STATUS_LABEL = {
  syncing: 'Saving…',
  offline: 'Offline — will sync later',
  error: 'Sync problem — retrying',
  partial: 'Some lists not saved'
};

const Icon = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>
);
const btnStyle = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 };

/** Delete the list (asks first), then go back to the deck dashboard. Lives in the Maintenance section. */
export function DeleteListButton({ listId }) {
  const navigate = useNavigate();
  const { getList, deleteList } = useLists();
  const onDelete = () => {
    if (!window.confirm(`Delete "${getList(listId)?.name}"? This cannot be undone.`)) return;
    deleteList(listId);
    navigate('/', { replace: true });
  };
  return (
    <button type="button" onClick={onDelete} className="btn-secondary-sm settings-maint-btn settings-danger">
      <Icon><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></Icon>
      Delete deck
    </button>
  );
}

/** Rename, save a copy, and import words, shown above the settings card (plus word count and sync status). */
export default function WordListManager({ listId, wordCount = 0, importOpen = false, onToggleImport }) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { getList, createList, renameList, syncStatus, syncMessage, atListLimit } = useLists();
  const [message, setMessage] = useState('');

  const current = getList(listId);
  const isDefault = listId === DEFAULT_LIST_ID;

  const onRename = () => {
    const name = window.prompt('Rename list:', current?.name ?? '');
    if (name && name.trim()) renameList(listId, name);
  };

  const onSaveAs = () => {
    const name = window.prompt('Name for a copy of this list (e.g. "Week 4"):', isDefault ? 'My Words' : `${current?.name ?? 'List'} copy`);
    if (!name || !name.trim()) return;
    if (atListLimit) {
      setMessage('You have reached the 25 list limit. Delete a list first.');
      return;
    }
    setMessage('');
    navigate(`/lists/${createList(name, current?.wordsRaw ?? '')}`);
  };

  const statusText = isLoggedIn ? STATUS_LABEL[syncStatus] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      {!isDefault && (
        <button type="button" onClick={onRename} className="btn-secondary-sm" style={btnStyle}>
          <Icon><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" y1="20" x2="15" y2="20" /><line x1="12" y1="4" x2="12" y2="20" /></Icon>
          Rename
        </button>
      )}
      <button type="button" onClick={onSaveAs} className="btn-secondary-sm" style={btnStyle}>
        <Icon><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Icon>
        Save as…
      </button>
      {onToggleImport && (
        <button type="button" onClick={onToggleImport} className="btn-secondary-sm" style={btnStyle}
          aria-expanded={importOpen}>
          <Icon><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>
          {importOpen ? 'Close editor' : 'Edit Words'}
        </button>
      )}
      <span style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', fontWeight: 600 }}>
        {wordCount} {wordCount === 1 ? 'word' : 'words'}
      </span>
      {(statusText || syncMessage) && (
        <span role="status" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
          {statusText}{syncStatus === 'partial' && syncMessage ? ` — ${syncMessage}` : ''}
        </span>
      )}
      {message && <span role="alert" style={{ fontSize: '0.75rem', color: '#ef4444' }}>{message}</span>}
    </div>
  );
}

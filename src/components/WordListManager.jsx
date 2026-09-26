import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLists } from '../hooks/useLists';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_LIST_ID } from '../services/storageService';

const STATUS_LABEL = {
  syncing: 'Saving…',
  offline: 'Offline — will sync later',
  error: 'Sync problem — retrying',
  partial: 'Some lists not saved'
};

/**
 * Practice-toolbar list controls: pick a list (each has its own URL), save the
 * current one under a name, rename, delete, and see sync status.
 */
export default function WordListManager({ listId }) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { lists, defaultList, getList, createList, renameList, deleteList, syncStatus, syncMessage, atListLimit } = useLists();
  const [message, setMessage] = useState('');

  const current = getList(listId);
  const isDefault = listId === DEFAULT_LIST_ID;

  const onSelect = (e) => navigate(`/lists/${e.target.value}`);

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

  const onRename = () => {
    const name = window.prompt('Rename list:', current?.name ?? '');
    if (name && name.trim()) renameList(listId, name);
  };

  const onDelete = () => {
    if (isDefault) return;
    if (!window.confirm(`Delete "${current?.name}"? This cannot be undone.`)) return;
    deleteList(listId);
    navigate('/', { replace: true });
  };

  const statusText = isLoggedIn ? STATUS_LABEL[syncStatus] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <label htmlFor="list-select" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted-foreground)' }}>
        📚 List:
      </label>
      <select
        id="list-select"
        value={listId}
        onChange={onSelect}
        className="speed-preset-select"
        aria-label="Choose a word list"
      >
        <option value={defaultList.id}>{defaultList.name}</option>
        {lists.map(l => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      <button type="button" onClick={onSaveAs} className="btn-secondary-sm" style={{ fontWeight: 700 }}>
        Save as…
      </button>
      {!isDefault && (
        <>
          <button type="button" onClick={onRename} className="btn-secondary-sm">Rename</button>
          <button type="button" onClick={onDelete} className="btn-secondary-sm" style={{ color: '#ef4444' }}>Delete</button>
        </>
      )}
      <Link to="/lists" className="btn-secondary-sm" style={{ textDecoration: 'none' }}>All lists</Link>
      {(statusText || syncMessage) && (
        <span role="status" style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
          {statusText}{syncStatus === 'partial' && syncMessage ? ` — ${syncMessage}` : ''}
        </span>
      )}
      {message && <span role="alert" style={{ fontSize: '0.75rem', color: '#ef4444' }}>{message}</span>}
    </div>
  );
}

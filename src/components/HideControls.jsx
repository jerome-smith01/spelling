import React from 'react';

export default function HideControls({
  denominator,
  onDenominatorChange,
  onHideAll,
  onShowAll
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap'
    }}>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'var(--muted-foreground)'
      }}>
        Ratio:
        <select
          value={denominator}
          onChange={(e) => onDenominatorChange(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          style={{
            padding: '0.35rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--card-border)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--foreground)',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value={2}>Hide 1 in 2 letters</option>
          <option value={3}>Hide 1 in 3 letters</option>
          <option value="all">Hide all letters</option>
        </select>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          type="button"
          onClick={onHideAll}
          className="btn-secondary-sm"
          style={{ fontWeight: 700 }}
        >
          Hide All
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className="btn-secondary-sm"
        >
          Show All
        </button>
      </div>
    </div>
  );
}

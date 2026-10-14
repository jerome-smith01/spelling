import React, { useState } from 'react';
import Modal from './Modal';
import { familyErrorMessage } from '../services/familyApi';

/**
 * Asks for the adult's 4-digit PIN. `onSubmit(pin)` should reject on a wrong PIN; the
 * message from the server (tries left, lockout) is shown under the field.
 */
export default function PinPad({ title = 'Grown-up PIN', hint = 'Enter your 4-digit PIN.', submitLabel = 'Continue', onSubmit, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin) || busy) return;
    setBusy(true);
    setError('');
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(familyErrorMessage(err));
      setPin('');
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ margin: 0, color: 'var(--muted-foreground)' }}>{hint}</p>
        <label className="settings-field">
          PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            style={{ fontSize: '1.5rem', letterSpacing: '0.5rem', textAlign: 'center', maxWidth: '10rem' }}
          />
        </label>
        {error && <p role="alert" style={{ margin: 0, color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-secondary-sm" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-verify" disabled={pin.length !== 4 || busy}>{submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}

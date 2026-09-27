import React, { useEffect, useState } from 'react';
import { getDigestPrefs, setDigestEmail } from '../services/coachingApi';

/**
 * Opt-in for the weekly summary email. Off by default; the email goes to the
 * address on the account and every message has an unsubscribe link.
 */
export default function DigestEmailToggle() {
  const [enabled, setEnabled] = useState(null);   // null = still loading
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getDigestPrefs()
      .then((p) => { if (!cancelled) setEnabled(!!p?.email_opt_in); })
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, []);

  const onChange = async (e) => {
    const next = e.target.checked;
    setSaving(true);
    setError('');
    try {
      const saved = await setDigestEmail(next);
      setEnabled(!!saved?.email_opt_in);
    } catch {
      setError('Could not save your choice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
        <input
          type="checkbox"
          checked={!!enabled}
          disabled={enabled === null || saving}
          onChange={onChange}
        />
        Email me this summary every week
      </label>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
        Sent to the email on your account. You can turn it off any time.
      </p>
      {error && <p role="alert" style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>{error}</p>}
    </div>
  );
}

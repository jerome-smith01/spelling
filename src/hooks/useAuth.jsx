import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, logout as apiLogout, AuthError } from '../services/apiService';

// status: 'loading' | 'anonymous' | 'authenticated' | 'expired'
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    try {
      const user = await getMe();
      setState(prev => {
        if (user) return { status: 'authenticated', user };
        // Was signed in, now isn't: session expired
        return { status: prev.status === 'authenticated' ? 'expired' : 'anonymous', user: null };
      });
    } catch {
      // Offline / server error: keep what we knew; don't treat it as logged out
      setState(prev => (prev.status === 'loading' ? { status: 'anonymous', user: null } : prev));
    }
  }, []);

  useEffect(() => {
    refresh();
    // Pick up a login/logout done in another tab
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      // Already logged out server-side is fine; still clear locally
      if (!(err instanceof AuthError)) console.error('Logout failed', err);
    }
    setState({ status: 'anonymous', user: null });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      isLoggedIn: state.status === 'authenticated',
      refresh,
      logout
    }),
    [state, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { accountClientError, getAccountClient } from './client';

export function useAccountSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!accountClientError);
  const [error, setError] = useState<string | null>(accountClientError);
  useEffect(() => {
    if (accountClientError) return;
    let active = true;
    let revision = 0;
    const client = getAccountClient();
    // The callback is deliberately synchronous: no SDK calls while its auth lock is held.
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      revision++;
      if (active) { setSession(next); setError(null); setLoading(false); }
    });
    const initialRevision = revision;
    void client.auth.getSession().then(result => {
      if (!active || revision !== initialRevision) return;
      if (result.error) setError('Sitzung konnte nicht geladen werden.');
      setSession(result.data.session); setLoading(false);
    }).catch(() => { if (active) { setError('Sitzung konnte nicht geladen werden.'); setLoading(false); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return { session, loading, error };
}

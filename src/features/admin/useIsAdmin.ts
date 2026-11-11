import { useEffect, useState } from 'react';
import { fetchIsAdmin } from './adminApi';

/** Ob das angemeldete Konto zum Spots-Team gehört. Ohne Konto immer false; die Datenbank entscheidet. */
export function useIsAdmin(userId: string | null) {
  const [result, setResult] = useState<{ userId: string; allowed: boolean } | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    fetchIsAdmin().then((allowed) => { if (active) setResult({ userId, allowed }); })
      .catch(() => { if (active) setResult({ userId, allowed: false }); });
    return () => { active = false; };
  }, [userId]);
  const known = !!userId && result?.userId === userId;
  return { allowed: known && !!result?.allowed, checking: !!userId && !known };
}

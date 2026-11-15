import { useEffect, useState } from 'react';
import { accountClientMode } from '../accounts/client';
import { fetchAccountType, type AccountType } from '../organizer/organizerApi';

// Kontoart pro Konto merken: Sie ändert sich nach der Registrierung nie (SQL 28).
const known = new Map<string, AccountType>();

/** null = noch unbekannt (lädt). Ohne Konto oder bei der Team-Anmeldung (Produktion) immer „private“. */
export function useAccountType(userId: string | null): AccountType | null {
  const [loaded, setLoaded] = useState<{ userId: string; type: AccountType } | null>(null);
  const enabled = !!userId && accountClientMode === 'full';
  useEffect(() => {
    if (!enabled || !userId || known.has(userId)) return;
    let active = true;
    fetchAccountType().then((type) => {
      known.set(userId, type);
      if (active) setLoaded({ userId, type });
    }).catch(() => { if (active) setLoaded({ userId, type: 'private' }); });
    return () => { active = false; };
  }, [enabled, userId]);
  if (!enabled || !userId) return 'private';
  return known.get(userId) ?? (loaded?.userId === userId ? loaded.type : null);
}

export async function loadAccountType(userId: string): Promise<AccountType> {
  const cached = known.get(userId);
  if (cached) return cached;
  const type = await fetchAccountType();
  known.set(userId, type);
  return type;
}

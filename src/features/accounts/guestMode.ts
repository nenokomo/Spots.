import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// „Als Gast fortfahren“ gilt nur, solange die App läuft: Bei jedem App-Start kommt wieder die Startseite
// (Entscheidung Jacint, 15.11.). Nichts davon wird gespeichert.
let current = false;
const listeners = new Set<(value: boolean) => void>();

// Frühere Versionen haben die Wahl auf dem Gerät gespeichert; diesen Eintrag einmal entfernen.
void AsyncStorage.removeItem('spots.guest.v1').catch(() => {});

export async function setGuestMode(value: boolean): Promise<void> {
  current = value;
  listeners.forEach((listener) => listener(value));
}

export function useGuestMode(): boolean {
  const [value, setValue] = useState(current);
  useEffect(() => {
    listeners.add(setValue);
    return () => { listeners.delete(setValue); };
  }, []);
  return value;
}

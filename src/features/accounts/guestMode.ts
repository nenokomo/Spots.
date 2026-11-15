import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// „Als Gast fortfahren“: Die App merkt sich die Wahl auf dem Gerät und startet danach direkt im Radar.
// Beim Anmelden und Abmelden wird sie zurückgesetzt, damit nach dem Abmelden wieder die Startseite kommt.
const key = 'spots.guest.v1';
let current: boolean | null = null;
const listeners = new Set<(value: boolean) => void>();
let loading: Promise<void> | null = null;

function load() {
  loading ??= AsyncStorage.getItem(key).then((value) => { current = value === '1'; }, () => { current = false; })
    .then(() => { listeners.forEach((listener) => listener(current === true)); });
  return loading;
}

export async function setGuestMode(value: boolean): Promise<void> {
  current = value;
  listeners.forEach((listener) => listener(value));
  try { await (value ? AsyncStorage.setItem(key, '1') : AsyncStorage.removeItem(key)); } catch { /* nur Komfort */ }
}

/** null = wird noch gelesen. */
export function useGuestMode(): boolean | null {
  const [value, setValue] = useState<boolean | null>(current);
  useEffect(() => {
    listeners.add(setValue);
    if (current === null) void load();
    return () => { listeners.delete(setValue); };
  }, []);
  return value ?? current;
}

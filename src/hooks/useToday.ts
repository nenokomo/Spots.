import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey, partyWindowKey } from '../utils/events';

function useDateWindow(readKey: () => string) {
  const [today, setToday] = useState(readKey);
  useEffect(() => {
    const refresh = () => setToday(readKey());
    const timer = setInterval(refresh, 30_000);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [readKey]);
  return today;
}

export function useToday() { return useDateWindow(dayKey); }
export function usePartyWindow() { return useDateWindow(partyWindowKey); }

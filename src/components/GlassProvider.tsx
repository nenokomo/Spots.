import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

const GlassContext = createContext(false);

export function GlassProvider({ children }: PropsWithChildren) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((reduced) => { if (active) setAllowed(!reduced); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (reduced) => setAllowed(!reduced));
    return () => { active = false; listener.remove(); };
  }, []);
  return <GlassContext.Provider value={allowed}>{children}</GlassContext.Provider>;
}

export function useGlassAllowed() { return useContext(GlassContext); }

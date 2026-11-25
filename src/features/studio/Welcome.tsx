import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { MenuRow, StudioButton, StudioSheet } from './ui';

// Auf diesem Gerät schon gezeigt? Nur ein Merker, keine Daten über das Konto.
const seenKey = 'spots.studio-welcome.v1';

/** Einmaliges Willkommen beim ersten Öffnen des Studios: die drei Dinge, die man hier tut, und wo. */
export function Welcome() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(seenKey).then((seen) => { if (active && !seen) setVisible(true); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const close = () => { setVisible(false); void AsyncStorage.setItem(seenKey, '1').catch(() => {}); };
  return <StudioSheet visible={visible} title="Willkommen im Studio" onClose={close}>
    <MenuRow icon="plus" title="Event anlegen" hint="Tippt auf das Plus unten rechts." />
    <MenuRow icon="camera" title="Story posten" hint="Tippt am Event auf euer Profilbild." />
    <MenuRow icon="chart" title="Zahlen sehen" hint="Wie viele euer Event gesehen und gemerkt haben." />
    <StudioButton label="Los geht's" onPress={close} />
  </StudioSheet>;
}

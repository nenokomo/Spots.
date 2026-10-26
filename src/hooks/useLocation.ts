import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import type { City } from '../services/cities';

export const berlinCenter = { latitude: 52.52, longitude: 13.405 };

export function useLocation() {
  const [center, setCenter] = useState(berlinCenter);
  const [label, setLabel] = useState('Berlin');
  const [message, setMessage] = useState('Demo-Karte · Berlin');
  const [loading, setLoading] = useState(false);
  const requesting = useRef(false);
  const revision = useRef(0);

  function selectCity(city: City) {
    revision.current++;
    requesting.current = false;
    setLoading(false);
    setCenter({ latitude: city.latitude, longitude: city.longitude });
    setLabel(city.name);
    setMessage(`${city.name} · Eventdaten sind Beispiele`);
  }

  async function locate() {
    if (requesting.current) return;
    requesting.current = true;
    const currentRevision = ++revision.current;
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (currentRevision !== revision.current) return;
      if (permission.status !== 'granted') {
        setMessage('Keine Freigabe · Demo-Karte bleibt nutzbar');
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (currentRevision !== revision.current) return;
      if (!servicesEnabled) {
        setMessage('Bitte die Standortdienste aktivieren');
        return;
      }
      // No tracking or background access. Use a recent fix, then a one-off lookup.
      const position = await Location.getLastKnownPositionAsync({ maxAge: 60_000 })
        ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (currentRevision !== revision.current) return;
      setCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLabel('Dein Standort');
      setMessage('Standort gefunden · Eventdaten sind Beispiele');
    } catch {
      if (currentRevision === revision.current) setMessage('Standort nicht verfügbar · bitte erneut versuchen');
    } finally {
      if (currentRevision === revision.current) {
        requesting.current = false;
        setLoading(false);
      }
    }
  }

  return { center, label, message, loading, locate, selectCity };
}

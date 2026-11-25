import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, Platform } from 'react-native';

// Wie sich das Studio anfühlt: spürbare Rückmeldung (expo-haptics) und Rücksicht auf „Bewegung reduzieren“.
// Haptik gibt es nur dort, wo etwas Bedeutendes passiert – ein Erfolg, ein Fehler, eine Auswahl, der Tipp aufs Plus.
// Auf iOS bleibt sie von selbst stumm, wenn der Stromsparmodus an oder die Haptik des Systems aus ist.

const run = (task: () => Promise<void>) => {
  if (Platform.OS === 'web') return;
  void task().catch(() => { /* Gerät ohne Haptik: einfach nichts */ });
};

export const feedback = {
  /** Etwas hat geklappt (gespeichert, veröffentlicht, gepostet). `message` wird für VoiceOver und TalkBack angesagt. */
  success(message?: string) {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    if (message) AccessibilityInfo.announceForAccessibility(message);
  },
  /** Etwas hat nicht geklappt. Die Meldung selbst steht als Text da und wird dort angesagt. */
  error() { run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)); },
  /** Eine Auswahl wechselt (Chip, Umschalter). */
  select() { run(() => Haptics.selectionAsync()); },
  /** Ein wichtiger Knopf (das Plus). */
  tap() { run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)); },
};

// „Bewegung reduzieren“ des Systems: einmal lesen und Änderungen mitbekommen.
let reduced = false;
void AccessibilityInfo.isReduceMotionEnabled().then((value) => { reduced = value; }).catch(() => {});
AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => { reduced = value; });
/** Soll auf Animationen verzichtet werden? Dann erscheinen Inhalte sofort in ihrem Endzustand. */
export const motionReduced = () => reduced;

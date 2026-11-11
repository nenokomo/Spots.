import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space, squircle, type } from '../constants/theme';
import { reportVenue } from '../services/venues';
import { venueReportReasons, type VenueReportReason } from '../types/venues';
import { Button } from './ui/Button';
import { ListGroup, ListRow } from './ui/List';
import { Sheet } from './ui/Sheet';

type Props = { venueId: string; venueName: string; visible: boolean; onClose: () => void };

/** „Fehler melden“ ohne Konto: fester Grund plus optionaler kurzer Hinweis. Das Spots-Team prüft jede Meldung. */
export function VenueReportSheet({ venueId, venueName, visible, onClose }: Props) {
  const [reason, setReason] = useState<VenueReportReason | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  function close() {
    onClose();
    if (state === 'sent') { setReason(null); setNote(''); setState('idle'); }
    setError(null);
  }

  async function send() {
    if (!reason) return;
    setState('sending');
    setError(null);
    try {
      await reportVenue(venueId, reason, note);
      setState('sent');
    } catch (failure) {
      setState('idle');
      setError(failure instanceof Error ? failure.message : 'Die Meldung konnte nicht gesendet werden.');
    }
  }

  return (
    <Sheet visible={visible} title="Fehler melden" onClose={close}>
      {state === 'sent'
        ? <View style={styles.done}>
            <Text accessibilityRole="alert" style={styles.doneTitle}>Danke für deinen Hinweis!</Text>
            <Text style={styles.text}>Das Spots-Team prüft die Meldung zu „{venueName}“. Erst danach ändert sich etwas.</Text>
            <Button label="Schließen" variant="secondary" onPress={close} />
          </View>
        : <>
            <Text style={styles.text}>Was stimmt bei „{venueName}“ nicht? Du brauchst dafür kein Konto.</Text>
            <ListGroup>
              {venueReportReasons.map((item) => (
                <ListRow key={item.id} title={item.label} value={reason === item.id ? '✓' : undefined}
                  accessibilityLabel={`${item.label}${reason === item.id ? ', ausgewählt' : ''}`}
                  onPress={() => setReason(item.id)} />
              ))}
            </ListGroup>
            <View>
              <TextInput value={note} onChangeText={setNote} maxLength={500} multiline
                placeholder="Optional: kurzer Hinweis (keine persönlichen Daten)" placeholderTextColor={colors.faint}
                accessibilityLabel="Optionaler Hinweis zur Meldung" style={styles.input} />
              <Text style={styles.counter}>{note.length}/500</Text>
            </View>
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Button label="Meldung senden" icon="share" onPress={() => void send()} disabled={!reason} loading={state === 'sending'}
              accessibilityLabel={reason ? 'Meldung senden' : 'Zuerst einen Grund auswählen'} />
          </>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  text: { ...type.body, color: colors.muted },
  input: { ...type.body, color: colors.text, minHeight: 88, padding: space.md, borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh, textAlignVertical: 'top', ...squircle },
  counter: { ...type.caption, color: colors.faint, alignSelf: 'flex-end', marginTop: space.xxs },
  error: { ...type.footnote, color: colors.danger },
  done: { gap: space.md },
  doneTitle: { ...type.title3, color: colors.text },
});

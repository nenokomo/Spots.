import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space, squircle, type } from '../constants/theme';
import { shotReportReasons, type ShotReportReason } from '../services/content';
import { Button } from './ui/Button';
import { ListGroup, ListRow } from './ui/List';

type Props = {
  title: string;
  question: string;
  /** Shown after sending, e.g. what happens with the report. */
  sentText: string;
  bottomInset: number;
  onSend: (reason: ShotReportReason) => Promise<void>;
  onDone: () => void;
};

/** Reasons and send button for reporting a picture (shot or organizer story), shown over the paused viewer. */
export function ReportPanel({ title, question, sentText, bottomInset, onSend, onDone }: Props) {
  const [reason, setReason] = useState<ShotReportReason | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  async function send() {
    if (!reason) return;
    setState('sending');
    setError(null);
    try { await onSend(reason); setState('sent'); }
    catch (failure) { setState('idle'); setError(failure instanceof Error ? failure.message : 'Die Meldung konnte nicht gesendet werden.'); }
  }
  return (
    <View style={styles.panelLayer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Melden abbrechen" onPress={onDone} style={StyleSheet.absoluteFill} />
      <View style={[styles.panel, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}>
        {state === 'sent'
          ? <>
              <Text accessibilityRole="alert" style={styles.panelTitle}>Danke für deine Meldung</Text>
              <Text style={styles.panelText}>{sentText}</Text>
              <Button label="Schließen" variant="secondary" onPress={onDone} />
            </>
          : <>
              <Text style={styles.panelTitle}>{title}</Text>
              <Text style={styles.panelText}>{question}</Text>
              <ListGroup>
                {shotReportReasons.map((item) => (
                  <ListRow key={item.id} title={item.label} value={reason === item.id ? '✓' : undefined}
                    accessibilityLabel={`${item.label}${reason === item.id ? ', ausgewählt' : ''}`} onPress={() => setReason(item.id)} />
                ))}
              </ListGroup>
              {error && <Text accessibilityRole="alert" style={styles.panelError}>{error}</Text>}
              <View style={styles.panelActions}>
                <Button label="Abbrechen" variant="secondary" onPress={onDone} style={styles.flex} />
                <Button label="Melden" onPress={() => void send()} disabled={!reason} loading={state === 'sending'} style={styles.flex}
                  accessibilityLabel={reason ? 'Meldung senden' : 'Zuerst einen Grund auswählen'} />
              </View>
            </>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panelLayer: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  panel: { gap: space.md, padding: space.lg, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.surfaceRaised, ...squircle },
  panelTitle: { ...type.title3, color: colors.text },
  panelText: { ...type.callout, color: colors.muted },
  panelError: { ...type.footnote, color: colors.danger },
  panelActions: { flexDirection: 'row', gap: space.sm },
});

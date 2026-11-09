import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function EventDataState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (!loading && !error) return null;
  return <View style={styles.state}>
    {loading && <ActivityIndicator color={colors.pink} accessibilityLabel="Events werden geladen" />}
    <Text accessibilityRole={error ? 'alert' : undefined} style={styles.text}>{error ?? 'Spots werden geladen …'}</Text>
    {error && <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>Erneut versuchen</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  state: { padding: 16, alignItems: 'center', gap: 10 },
  text: { color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  retry: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center' },
  retryText: { color: colors.pink, fontSize: 12, fontWeight: '600' },
});

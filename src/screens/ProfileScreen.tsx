import Constants from 'expo-constants';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { Icon, type IconName } from '../components/Icon';
import { Screen } from '../components/Screen';
import { tabBarContentInset } from '../constants/navigation';
import { brandDotStyle, brandHeadingStyle, colors } from '../constants/theme';
import { useSavedEvents } from '../hooks/useSavedEvents';
import { accountClientError } from '../features/accounts/client';
import { useAccountSession } from '../features/accounts/useAccountSession';

function Row({ icon, title, text, trailing }: { icon: IconName; title: string; text: string; trailing?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><Icon name={icon} size={19} color={colors.pink} /></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowText}>{text}</Text></View>
      {trailing}
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { ids, ready } = useSavedEvents();
  const account = useAccountSession();
  const email = account.session?.user.email;
  const version = Constants.expoConfig?.version;
  const savedText = !ready ? 'Merkliste wird geladen …' : ids.length === 0 ? 'Noch nichts gemerkt' : `${ids.length} ${ids.length === 1 ? 'Event' : 'Events'} auf diesem Gerät`;
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentInset(insets.bottom) }]}>
        <Text style={styles.eyebrow}>SPOTS<Text style={brandDotStyle}>.</Text> / DEIN PROFIL</Text>
        <View style={styles.avatar}><Icon name="profile" color={colors.pink} size={38} /></View>
        <Text accessibilityRole="header" style={styles.title}>Dein Abend. Dein Ding.</Text>
        <Text style={styles.text}>Privat, minimal und ohne öffentliches Profil.</Text>

        <View style={styles.card}>
          <GlassBackdrop radius={20} variant="panel" />
          {accountClientError
            ? <Row icon="profile" title="Konto" text="Konten starten bald. Bis dahin funktioniert Spots komplett ohne Anmeldung." />
            : <Link href="/account" asChild><Pressable accessibilityRole="button" accessibilityLabel={email ? 'Konto verwalten' : 'Anmelden oder Konto erstellen'}>
                <Row icon="profile" title={email ? 'Angemeldet' : 'Anmelden'} text={email ?? (account.loading ? 'Sitzung wird geprüft …' : 'Anmelden oder kostenloses Konto erstellen')} trailing={<Icon name="chevron" size={16} />} />
              </Pressable></Link>}
          <View style={styles.divider} />
          <Link href="/saved" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={`Gemerkte Events öffnen, ${savedText}`}>
              <Row icon="heart" title="Gemerkte Events" text={savedText} trailing={<Icon name="chevron" size={16} />} />
            </Pressable>
          </Link>
        </View>

        <Text style={styles.section}>PRIVATSPHÄRE</Text>
        <View style={styles.card}>
          <GlassBackdrop radius={20} variant="panel" />
          <Row icon="locate" title="Standort" text="Wird nur für die Karte genutzt, solange du Spots verwendest. Kein Tracking im Hintergrund, keine Speicherung." />
          {Platform.OS !== 'web' && <>
            <View style={styles.divider} />
            <Pressable accessibilityRole="button" accessibilityLabel="Systemeinstellungen für Spots öffnen" onPress={() => void Linking.openSettings().catch(() => {})}>
              <Row icon="sliders" title="Berechtigungen verwalten" text="Standortfreigabe in den Systemeinstellungen ändern" trailing={<Icon name="chevron" size={16} />} />
            </Pressable>
          </>}
        </View>

        <Text style={styles.section}>ÜBER SPOTS</Text>
        <View style={styles.card}>
          <GlassBackdrop radius={20} variant="panel" />
          <Row icon="radar" title="Eventdaten" text="Echte Veranstaltungen aus öffentlichen Quellen, aktuell Goabase. Keine erfundenen Events." />
        </View>
        {version && <Text style={styles.version}>Spots · Version {version}</Text>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingTop: 19, paddingBottom: 30 },
  eyebrow: { ...brandHeadingStyle, alignSelf: 'flex-start' },
  avatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: '#c922ab66', backgroundColor: '#c922ab18', alignItems: 'center', justifyContent: 'center', marginTop: 30, marginBottom: 18 },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', textAlign: 'center', letterSpacing: -0.6 },
  text: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  section: { ...brandHeadingStyle, fontSize: 10, alignSelf: 'flex-start', marginTop: 24, marginBottom: 9, marginLeft: 4 },
  card: { width: '100%', borderWidth: 1, borderColor: colors.border, backgroundColor: '#ffffff06', borderRadius: 20, paddingHorizontal: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingVertical: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#c922ab16', alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  rowText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 50 },
  version: { color: '#a993ae', fontSize: 11, marginTop: 22 },
});

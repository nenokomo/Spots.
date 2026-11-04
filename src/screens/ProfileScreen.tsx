import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { Screen } from '../components/Screen';
import { brandDotStyle, brandHeadingStyle, colors } from '../constants/theme';
import { GlassBackdrop } from '../components/GlassBackdrop';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabBarContentInset } from '../constants/navigation';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentInset(insets.bottom) }]}>
        <Text style={styles.eyebrow}>SPOTS<Text style={brandDotStyle}>.</Text> / DEIN PROFIL</Text>
        <View style={styles.avatar}><Icon name="profile" color={colors.pink} size={43} /></View>
        <Text style={styles.title}>Dein Abend. Dein Ding.</Text>
        <Text style={styles.text}>Entdecke erst einmal, was die Nacht zu bieten hat.</Text>
        <View style={styles.note}><GlassBackdrop radius={20} variant="panel" /><Text style={styles.noteTitle}>Ein privater Platz für dich.</Text><Text style={styles.text}>Deine gemerkten Events bleiben auf diesem Gerät. Eine Anmeldung ist noch in Entwicklung. Dein Profil bleibt minimal und privat.</Text></View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingTop: 19, paddingBottom: 30 },
  eyebrow: { ...brandHeadingStyle, alignSelf: 'flex-start' },
  avatar: { width: 94, height: 94, borderRadius: 47, borderWidth: 1, borderColor: '#c922ab66', backgroundColor: '#c922ab18', alignItems: 'center', justifyContent: 'center', marginTop: 45, marginBottom: 25 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', textAlign: 'center', letterSpacing: -0.6 },
  text: { color: colors.muted, fontSize: 14, lineHeight: 23, textAlign: 'center', marginTop: 12 },
  note: { borderWidth: 1, borderColor: colors.border, padding: 22, backgroundColor: '#ffffff06', borderRadius: 20, marginTop: 35, width: '100%' },
  noteTitle: { color: colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
});

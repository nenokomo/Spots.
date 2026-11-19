import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBackdrop } from '../../components/GlassBackdrop';
import { Icon, type IconName } from '../../components/Icon';
import { floatingTabBar } from '../../constants/navigation';
import { isUpcoming, dayFormat } from './format';
import { useStudio } from './StudioContext';
import { studio, studioType } from './theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View pointerEvents="none" style={styles.icon}><Icon name={name} size={22} color={focused ? studio.text : studio.faint} /></View>;
}

/** The round „+“ in the middle of the bar, in the Orchidee gradient. */
function PlusButton({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Erstellen: Story oder Event" onPress={onPress} style={({ pressed }) => [styles.plusWrap, pressed && styles.pressed]}>
    <LinearGradient colors={studio.accentFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.plus}>
      <View style={styles.plusH} /><View style={styles.plusV} />
    </LinearGradient>
  </Pressable>;
}

type Choice = { icon: IconName; title: string; text: string; href?: Href; note?: string };

/** Sheet behind „+“: what an organizer can create. Posts (Beiträge) are not available in Studio yet. */
function CreateSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { events } = useStudio();
  const next = events.filter((event) => isUpcoming(event) && event.status === 'scheduled').sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const choices: Choice[] = [
    { icon: 'camera', title: 'Story in Entdecken', text: 'Bilder für eure Kachel in Entdecken.', href: '/studio/story' },
    { icon: 'calendar', title: 'Neues Event', text: 'Event anlegen, Flyer und Tickets eintragen.', href: { pathname: '/studio/event/[id]', params: { id: 'new' } } },
    next
      ? { icon: 'wave', title: 'Event-Story', text: `Fotos für „${next.title}“ (${dayFormat.format(new Date(next.startsAt))}), 24 Stunden sichtbar.`, href: { pathname: '/studio/event/[id]', params: { id: next.id } } }
      : { icon: 'wave', title: 'Event-Story', text: 'Fotos für die Eventseite.', note: 'Legt zuerst ein Event an.' },
    { icon: 'grid', title: 'Beitrag', text: 'Bilder und Text für eure Veranstalterseite.', note: 'Kommt bald' },
  ];
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <View style={styles.sheetBackdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Auswahl schließen" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
        <GlassBackdrop radius={26} variant="panel" />
        <View style={styles.sheetContent}>
          <View style={styles.grabber} />
          <Text accessibilityRole="header" style={styles.sheetTitle}>Was möchtet ihr erstellen?</Text>
          {choices.map((choice) => {
            const disabled = !choice.href;
            return <Pressable key={choice.title} accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={`${choice.title}. ${choice.text}${choice.note ? ` ${choice.note}` : ''}`}
              disabled={disabled} onPress={() => { onClose(); if (choice.href) router.push(choice.href); }}
              style={({ pressed }) => [styles.choice, disabled && styles.choiceDisabled, pressed && styles.pressed]}>
              <View style={styles.choiceIcon}><Icon name={choice.icon} size={20} color={studio.accent} /></View>
              <View style={styles.choiceCopy}>
                <Text style={styles.choiceTitle}>{choice.title}</Text>
                <Text numberOfLines={2} style={styles.choiceText}>{choice.text}</Text>
              </View>
              {choice.note ? <Text style={styles.choiceNote}>{choice.note}</Text> : <Icon name="chevron" size={16} color={studio.faint} />}
            </Pressable>;
          })}
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

/**
 * Reiterleiste von Spots Studio: Heute · Events · + · Zahlen · Profil, als schwebende Glas-Kapsel wie in der Besucher-App.
 * „+“ öffnet die Auswahl zum Erstellen. Zugang und gemeinsame Daten regelt StudioLayout darüber.
 */
export default function StudioTabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [creating, setCreating] = useState(false);
  const barWidth = Math.min(380, width - 32);
  const sideInset = (width - barWidth) / 2;
  return <>
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: studio.bg },
      tabBarActiveTintColor: studio.text,
      tabBarInactiveTintColor: studio.faint,
      tabBarStyle: { position: 'absolute', left: 0, right: 0, marginHorizontal: sideInset, bottom: Math.max(insets.bottom, floatingTabBar.bottomGap), backgroundColor: 'transparent', borderTopWidth: 0, elevation: 0, height: floatingTabBar.height, borderRadius: 33, paddingTop: 6, paddingBottom: 6 },
      tabBarIconStyle: { width: 52, height: 28 },
      tabBarLabelPosition: 'below-icon',
      tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2 },
      tabBarBackground: () => <View pointerEvents="none" style={styles.capsule}><GlassBackdrop radius={33} variant="panel" /></View>,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Heute', tabBarIcon: ({ focused }) => <TabIcon name="radar" focused={focused} /> }} />
      <Tabs.Screen name="events" options={{ title: 'Events', tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} /> }} />
      <Tabs.Screen name="create" options={{ title: 'Erstellen', tabBarButton: () => <PlusButton onPress={() => setCreating(true)} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Zahlen', tabBarIcon: ({ focused }) => <TabIcon name="wave" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} /> }} />
    </Tabs>
    <CreateSheet visible={creating} onClose={() => setCreating(false)} />
  </>;
}

const styles = StyleSheet.create({
  capsule: { ...StyleSheet.absoluteFill, borderRadius: 33 },
  icon: { width: 52, height: 28, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  plusWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffffff33', boxShadow: '0 0 18px 2px #ff4ab866' },
  plusH: { position: 'absolute', width: 20, height: 2.5, borderRadius: 2, backgroundColor: studio.text },
  plusV: { position: 'absolute', width: 2.5, height: 20, borderRadius: 2, backgroundColor: studio.text },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#000000b3' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  sheetContent: { padding: 20, paddingTop: 10, gap: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#ffffff40', marginBottom: 8 },
  sheetTitle: { ...studioType.heading, fontSize: 20, color: studio.text, marginBottom: 4 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: studio.radiusSmall, backgroundColor: studio.panel, borderWidth: 1, borderColor: studio.line },
  choiceDisabled: { opacity: 0.5 },
  choiceIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: studio.accentSoft },
  choiceCopy: { flex: 1, gap: 2 },
  choiceTitle: { ...studioType.heading, fontSize: 16, lineHeight: 21, color: studio.text },
  choiceText: { ...studioType.small, color: studio.muted },
  choiceNote: { ...studioType.label, fontSize: 10, color: studio.faint },
});

import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, gutter, radius, space, squircle, type } from '../../constants/theme';
import { IconButton } from './Button';

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode; tall?: boolean };

/** Bottom sheet with grabber, title and close button. */
export function Sheet({ visible, title, onClose, children, tall = false }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${title} schließen`} onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.sheet, tall && styles.tall]}>
          <View style={styles.grabber} />
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <IconButton icon="close" accessibilityLabel="Schließen" onPress={onClose} size={32} plain tint={colors.muted} style={styles.close} />
          </View>
          <View style={[styles.content, tall && styles.fill]}>{children}</View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#100916b3' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '92%', ...squircle },
  tall: { height: '86%' },
  fill: { flex: 1 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#ffffff40', marginTop: space.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: gutter, paddingTop: space.lg, paddingBottom: space.sm },
  title: { ...type.title2, color: colors.text, flex: 1 },
  close: { backgroundColor: colors.surfaceHigh },
  content: { paddingHorizontal: gutter, paddingTop: space.sm, paddingBottom: space.lg, gap: space.lg },
});

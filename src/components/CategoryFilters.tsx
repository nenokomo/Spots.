import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { categories, colors, type Category } from '../constants/theme';

export function CategoryFilters({ value, onChange }: { value: Category; onChange: (value: Category) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((category) => (
        <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: value === category }} onPress={() => onChange(category)} style={[styles.chip, value === category && styles.active]}>
          <Text style={[styles.text, value === category && styles.activeText]}>{category}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: 7, paddingHorizontal: 14, minHeight: 45 },
  chip: { paddingHorizontal: 16, minHeight: 34, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: '#b47dc91a' },
  active: { backgroundColor: colors.pink, borderColor: colors.pink },
  text: { color: colors.muted, fontSize: 11 },
  activeText: { color: '#35102d', fontWeight: '700' },
});

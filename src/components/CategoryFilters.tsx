import { StyleSheet, View } from 'react-native';
import { categories, space, type Category } from '../constants/theme';
import { Chip } from './ui/Chip';

export function CategoryFilters({ value, onChange }: { value: Category; onChange: (value: Category) => void }) {
  return (
    <View style={styles.row}>
      {categories.map((category) => (
        <Chip key={category} label={category} selected={value === category} onPress={() => onChange(category)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
});

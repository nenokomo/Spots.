import Slider from '@react-native-community/slider';
import { colors } from '../constants/theme';
import type { RadiusControlProps } from './RadiusControl.types';

export default function RadiusControl({ value, onValueChange, onSlidingComplete }: RadiusControlProps) {
  return <Slider accessibilityLabel="Gewünschter Radius in Kilometern" accessibilityValue={{ min: 5, max: 50, now: value, text: `${value} Kilometer` }} minimumValue={5} maximumValue={50} step={1} value={value} onValueChange={onValueChange} onSlidingComplete={onSlidingComplete} minimumTrackTintColor={colors.pink} maximumTrackTintColor="#ffffff20" thumbTintColor={colors.pink} style={{ flex: 1, height: 36 }} />;
}

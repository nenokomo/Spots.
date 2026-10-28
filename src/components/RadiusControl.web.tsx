import { colors } from '../constants/theme';
import type { RadiusControlProps } from './RadiusControl.types';

export default function RadiusControl({ value, onValueChange, onSlidingComplete }: RadiusControlProps) {
  return <input type="range" aria-label="Gewünschter Radius in Kilometern" aria-valuetext={`${value} Kilometer`} min={10} max={50} step={1} value={value}
    onChange={(event) => onValueChange(Number(event.currentTarget.value))}
    onPointerUp={(event) => onSlidingComplete(Number(event.currentTarget.value))}
    onPointerCancel={(event) => onSlidingComplete(Number(event.currentTarget.value))}
    onKeyUp={(event) => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) onSlidingComplete(Number(event.currentTarget.value)); }}
    onBlur={(event) => onSlidingComplete(Number(event.currentTarget.value))}
    style={{ flex: 1, minWidth: 0, height: 36, margin: 0, accentColor: colors.pink, cursor: 'pointer', background: 'transparent' }} />;
}

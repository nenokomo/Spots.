import { useState } from 'react';
import { Animated, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scaleTo?: number };

/** Pressable that gives quietly under the finger, like cards in the App Store. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, children, ...rest }: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const animate = (toValue: number) => Animated.spring(scale, { toValue, speed: 40, bounciness: 3, useNativeDriver: Platform.OS !== 'web', isInteraction: false }).start();
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(event) => { animate(scaleTo); onPressIn?.(event); }}
      onPressOut={(event) => { animate(1); onPressOut?.(event); }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

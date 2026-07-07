import { useRef, useEffect } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';

export default function Skeleton({ width = '100%', height, borderRadius = 8, style }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.tag, opacity },
        style,
      ]}
    />
  );
}
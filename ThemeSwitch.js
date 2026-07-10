import { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from './ThemeContext';

const WIDTH = 88;
const HEIGHT = 36;
const THUMB = 28;
const PADDING = 4;

export default function ThemeSwitch({ value, onValueChange }) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, WIDTH - THUMB - PADDING * 2],
  });

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EFEBE1', '#29283B'],
  });

  const sunOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const moonOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onValueChange(!value); }}
      accessible={true}
      accessibilityRole="switch"
      accessibilityLabel="Dark mode"
      accessibilityState={{ checked: value }}
      accessibilityHint="Toggles between light and dark theme"
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor, borderColor: theme.border }]}>
        <Animated.Text style={[styles.icon, styles.rightIcon, { opacity: sunOpacity }]}>☀️</Animated.Text>
        <Animated.Text style={[styles.icon, styles.leftIcon, { opacity: moonOpacity }]}>🌙</Animated.Text>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }], backgroundColor: theme.accent }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    borderWidth: 2,
    justifyContent: 'center',
    paddingHorizontal: PADDING,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
  },
  icon: {
    position: 'absolute',
    fontSize: 14,
  },
  leftIcon: {
    left: 8,
  },
  rightIcon: {
    right: 8,
  },
});

import { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet } from 'react-native';

const WIDTH = 88;
const HEIGHT = 36;
const THUMB = 28;
const PADDING = 4;

export default function ThemeSwitch({ value, onValueChange }) {
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
    outputRange: ['#ffffff', '#000000'],
  });

  const sunOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const moonOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)}>
      <Animated.View style={[styles.track, { backgroundColor: trackColor, borderColor: value ? '#555' : '#999' }]}>
        <Animated.Text style={[styles.icon, styles.rightIcon, { opacity: sunOpacity, color: '#000' }]}>☀️</Animated.Text>
        <Animated.Text style={[styles.icon, styles.leftIcon, { opacity: moonOpacity, color: '#fff' }]}>🌙</Animated.Text>
        <Animated.View style={[styles.thumb, { transform: [{ translateX }], backgroundColor: value ? '#fff' : '#000' }]} />
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
    color: '#000',
  },
  leftIcon: {
    left: 8,
  },
  rightIcon: {
    right: 8,
  },
});
import Svg, { Path, Rect, Circle } from 'react-native-svg';

export default function GClockMark({ size = 88, color = '#007AFF' }) {
  const scale = size / 260;

  return (
    <Svg width={size} height={size} viewBox="-130 -130 260 260">
      <Path
        d="M 0 -100 A 100 100 0 1 1 -70.7 70.7"
        fill="none"
        stroke={color}
        strokeWidth={22}
        strokeLinecap="round"
      />
      <Rect x={8} y={-11} width={58} height={22} rx={11} fill={color} />
      <Rect x={-6} y={-54} width={12} height={54} rx={6} fill={color} />
      <Circle cx={0} cy={0} r={10} fill={color} />
    </Svg>
  );
}
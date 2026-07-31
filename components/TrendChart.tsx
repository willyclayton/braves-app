import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { colors } from '@/constants/theme';

type Props = {
  values: number[];
  height?: number;
  color?: string;
  fillOpacity?: number;
};

/** Lightweight line chart for recent game-by-game values. */
export function TrendChart({
  values,
  height = 140,
  color = colors.gold,
}: Props) {
  const width = 320;

  const points = useMemo(() => {
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const padY = 12;
    const padX = 8;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    return values
      .map((v, i) => {
        const x = padX + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
        const y = padY + innerH - ((v - min) / span) * innerH;
        return `${x},${y}`;
      })
      .join(' ');
  }, [values, height]);

  const dots = useMemo(() => {
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const padY = 12;
    const padX = 8;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;
    return values.map((v, i) => {
      const x = padX + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      const y = padY + innerH - ((v - min) / span) * innerH;
      return { x, y, v };
    });
  }, [values, height]);

  if (!values.length) {
    return <View style={[styles.empty, { height }]} />;
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={3.2} fill={color} />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.navyLift,
    overflow: 'hidden',
  },
  empty: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.navyLift,
  },
});

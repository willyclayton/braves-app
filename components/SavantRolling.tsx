import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import type { SavantRolling } from '@/lib/savant';

const Y_MIN = 0.2;
const Y_MAX = 0.5;
const TICKS = [0.2, 0.3, 0.4, 0.5];

function fmt(v: number) {
  return v.toFixed(3).replace(/^0/, '');
}

export function SavantRolling({ data }: { data: SavantRolling | null }) {
  const [width, setWidth] = useState(320);
  const height = 168;
  const padL = 36;
  const padR = 44;
  const padY = 14;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const chart = useMemo(() => {
    if (!data?.values.length) return null;
    const innerW = width - padL - padR;
    const innerH = height - padY * 2;
    const n = data.values.length;
    const points = data.values
      .map((v, i) => {
        const x = padL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
        const y = padY + innerH - ((v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const lgY = padY + innerH - ((data.league - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;
    return { points, lgY, innerW };
  }, [data, width]);

  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.titleLead}>{data?.window ?? 100} PAs</Text>
        </View>
        <Text style={styles.title}>Rolling xwOBA</Text>
      </View>
      <View style={[styles.chart, { height }]} onLayout={onLayout}>
        {chart && data ? (
          <>
            <Svg width={width} height={height}>
              {TICKS.map((t) => {
                const y =
                  padY +
                  (height - padY * 2) -
                  ((t - Y_MIN) / (Y_MAX - Y_MIN)) * (height - padY * 2);
                return (
                  <Line
                    key={t}
                    x1={padL}
                    y1={y}
                    x2={width - padR}
                    y2={y}
                    stroke="#D0D0D0"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                );
              })}
              <Line
                x1={padL}
                y1={chart.lgY}
                x2={width - padR}
                y2={chart.lgY}
                stroke="#8A8A8A"
                strokeWidth={2}
                strokeDasharray="6 5"
              />
              <Polyline
                points={chart.points}
                fill="none"
                stroke="#B39DDB"
                strokeWidth={2.4}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </Svg>
            {TICKS.map((t) => {
              const y =
                padY +
                (height - padY * 2) -
                ((t - Y_MIN) / (Y_MAX - Y_MIN)) * (height - padY * 2);
              return (
                <Text key={t} style={[styles.yTick, { top: y - 7 }]}>
                  {fmt(t)}
                </Text>
              );
            })}
            <Text style={[styles.lg, { top: chart.lgY - 8 }]}>LG AVG</Text>
          </>
        ) : (
          <Text style={styles.empty}>Not enough plate appearances</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingTop: 8, paddingBottom: 4 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  titleLead: {
    fontFamily: 'DMSans_700Bold',
    color: '#1A1A1A',
    fontSize: 14,
    lineHeight: 16,
  },
  title: {
    fontFamily: 'DMSans_500Medium',
    color: '#1A1A1A',
    fontSize: 15,
  },
  chart: {
    width: '100%',
    position: 'relative',
  },
  yTick: {
    position: 'absolute',
    left: 0,
    width: 32,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: '#888',
    fontSize: 10,
  },
  lg: {
    position: 'absolute',
    right: 2,
    fontFamily: 'DMSans_700Bold',
    color: '#666',
    fontSize: 9,
    letterSpacing: 0.3,
  },
  empty: {
    fontFamily: 'DMSans_400Regular',
    color: '#888',
    textAlign: 'center',
    marginTop: 48,
    fontSize: 13,
  },
});

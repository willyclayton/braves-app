import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { sprayPolar, wallDistance, type SprayEvent, type SprayResult } from '@/lib/spray';

const VB_W = 300;
const VB_H = 300;
const CX = 150;
const HY = 262;
const SCALE = 0.4;

const HIT_COLOR: Record<SprayResult, string> = {
  single: '#E67E22',
  double: '#6B4C9A',
  triple: '#E0B425',
  home_run: '#E85A9A',
};

const LEGEND: { key: SprayResult; label: string }[] = [
  { key: 'single', label: 'SINGLE' },
  { key: 'double', label: 'DOUBLE' },
  { key: 'triple', label: 'TRIPLE' },
  { key: 'home_run', label: 'HOME RUN' },
];

type Pt = { x: number; y: number };

function toSvg(feetX: number, feetY: number): Pt {
  return { x: CX + feetX * SCALE, y: HY - feetY * SCALE };
}

function polar(angleDeg: number, dist: number): Pt {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(rad) * dist, y: Math.cos(rad) * dist };
}

function fairPath() {
  const steps = 20;
  const pts: Pt[] = [toSvg(0, 0)];
  for (let i = 0; i <= steps; i++) {
    const a = -45 + (90 * i) / steps;
    const p = polar(a, wallDistance(a));
    pts.push(toSvg(p.x, p.y));
  }
  pts.push(toSvg(0, 0));
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') + ' Z';
}

function wallPath() {
  const steps = 20;
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = -45 + (90 * i) / steps;
    const p = polar(a, wallDistance(a));
    pts.push(toSvg(p.x, p.y));
  }
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

function infieldDirt() {
  const home = toSvg(0, 0);
  const first = toSvg(63.6, 63.6);
  const second = toSvg(0, 127.3);
  const third = toSvg(-63.6, 63.6);
  return `M ${home.x} ${home.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Z`;
}

const WALL_MARKS = [
  { a: -45, label: '335' },
  { a: -22, label: '375' },
  { a: 0, label: '400' },
  { a: 22, label: '385' },
  { a: 45, label: '325' },
];

export function SavantSpray({
  season,
  events,
  isPitcher,
}: {
  season: number;
  events: SprayEvent[];
  isPitcher?: boolean;
}) {
  const [width, setWidth] = useState(320);
  const height = Math.round(width * (VB_H / VB_W));
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const dots = useMemo(
    () =>
      events.map((ev) => {
        const { angle, dist } = sprayPolar(ev.x, ev.y);
        const travel = ev.result === 'home_run' && ev.dist && ev.dist > 280 ? ev.dist : dist;
        const ft = polar(angle, travel);
        return { ...toSvg(ft.x, ft.y), result: ev.result };
      }),
    [events]
  );

  const lf = toSvg(polar(-45, wallDistance(-45)).x, polar(-45, wallDistance(-45)).y);
  const rf = toSvg(polar(45, wallDistance(45)).x, polar(45, wallDistance(45)).y);
  const home = toSvg(0, 0);
  const b1 = toSvg(63.6, 63.6);
  const b2 = toSvg(0, 127.3);
  const b3 = toSvg(-63.6, 63.6);
  const mound = toSvg(0, 60.5);

  return (
    <View style={styles.block}>
      <Text style={styles.title}>
        {season} {isPitcher ? 'Hits Allowed' : 'Hits'} Spray Chart
      </Text>
      <View style={[styles.field, { height }]} onLayout={onLayout}>
        <View style={styles.legend}>
          {LEGEND.map((item) => (
            <View key={item.key} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: HIT_COLOR[item.key] }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Path d={fairPath()} fill="#C8E6E4" />
          <Path d={infieldDirt()} fill="#D7C4A3" fillOpacity={0.55} />
          <Circle cx={mound.x} cy={mound.y} r={7} fill="#D7C4A3" />
          <Line x1={home.x} y1={home.y} x2={lf.x} y2={lf.y} stroke="#FFFFFF" strokeWidth={1.6} />
          <Line x1={home.x} y1={home.y} x2={rf.x} y2={rf.y} stroke="#FFFFFF" strokeWidth={1.6} />
          <Path d={wallPath()} fill="none" stroke="#8BB8B6" strokeWidth={2} />
          {[b1, b2, b3].map((b, i) => (
            <Polygon
              key={i}
              points={`${b.x},${b.y - 3} ${b.x + 3},${b.y} ${b.x},${b.y + 3} ${b.x - 3},${b.y}`}
              fill="#FFFFFF"
            />
          ))}
          <Polygon
            points={`${home.x},${home.y + 3.5} ${home.x + 4.5},${home.y - 1} ${home.x},${home.y - 4.5} ${home.x - 4.5},${home.y - 1}`}
            fill="#FFFFFF"
          />
          {WALL_MARKS.map((m) => {
            const p = polar(m.a, wallDistance(m.a) + 14);
            const s = toSvg(p.x, p.y);
            return (
              <SvgText
                key={m.a}
                x={s.x}
                y={s.y}
                fill="#8A8A8A"
                fontSize="8"
                fontWeight="600"
                textAnchor="middle"
              >
                {m.label}
              </SvgText>
            );
          })}
          <G>
            {dots.map((d, i) => (
              <Circle key={i} cx={d.x} cy={d.y} r={3.1} fill={HIT_COLOR[d.result]} opacity={0.92} />
            ))}
          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingBottom: 8 },
  title: {
    fontFamily: 'DMSans_700Bold',
    color: '#1A1A1A',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  field: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  legend: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
    gap: 3,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 8, height: 8, borderRadius: 8 },
  legendLabel: {
    fontFamily: 'DMSans_700Bold',
    color: '#555',
    fontSize: 8,
    letterSpacing: 0.4,
  },
});

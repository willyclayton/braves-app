import { useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors } from '@/constants/theme';

type Props = {
  values: number[];
  /** Optional per-point labels (e.g. dates) shown while scrubbing */
  labels?: string[];
  height?: number;
  color?: string;
};

type ChartGeom = {
  width: number;
  height: number;
  padL: number;
  padR: number;
  padY: number;
  innerW: number;
  innerH: number;
  min: number;
  max: number;
  span: number;
};

function niceNum(range: number, round: boolean) {
  const exp = Math.floor(Math.log10(range || 1));
  const frac = range / Math.pow(10, exp);
  let nice: number;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else if (frac <= 1) nice = 1;
  else if (frac <= 2) nice = 2;
  else if (frac <= 5) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

/** Nice y-axis ticks covering data range. */
function yTicks(minRaw: number, maxRaw: number, count = 4) {
  if (!Number.isFinite(minRaw) || !Number.isFinite(maxRaw)) {
    return { min: 0, max: 1, ticks: [0, 1] };
  }
  if (minRaw === maxRaw) {
    const pad = Math.abs(minRaw) < 1 ? 1 : Math.abs(minRaw) * 0.2;
    const min = minRaw - pad;
    const max = maxRaw + pad;
    return { min, max, ticks: [minRaw - pad / 2, minRaw, maxRaw + pad / 2].map((t) => +t.toFixed(4)) };
  }
  const range = niceNum(maxRaw - minRaw, false);
  const step = niceNum(range / (count - 1), true);
  const min = Math.floor(minRaw / step) * step;
  const max = Math.ceil(maxRaw / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step * 0.5; v += step) {
    ticks.push(+v.toFixed(6));
  }
  return { min, max, ticks };
}

function geom(values: number[], height: number, width: number): ChartGeom & { ticks: number[] } {
  const padY = 16;
  const padL = 36;
  const padR = 12;
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const { min, max, ticks } = yTicks(minRaw, maxRaw, 4);
  return {
    width,
    height,
    padL,
    padR,
    padY,
    innerW: width - padL - padR,
    innerH: height - padY * 2,
    min,
    max,
    span: max - min || 1,
    ticks,
  };
}

function xy(g: ChartGeom, i: number, v: number, n: number) {
  const x = g.padL + (n === 1 ? g.innerW / 2 : (i / (n - 1)) * g.innerW);
  const y = g.padY + g.innerH - ((v - g.min) / g.span) * g.innerH;
  return { x, y };
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function linearTrend(values: number[]) {
  const n = values.length;
  if (n < 2) return { a: values[0] || 0, b: 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX || 1;
  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (Number.isInteger(n) || abs >= 10) return String(Math.round(n * 10) / 10);
  if (abs >= 1) return (Math.round(n * 100) / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return (Math.round(n * 100) / 100).toString();
}

function indexFromX(g: ChartGeom, x: number, n: number) {
  if (n <= 1) return 0;
  const t = (x - g.padL) / g.innerW;
  return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
}

/** Game-log chart with axis labels and scrubbing. */
export function TrendChart({
  values,
  labels,
  height = 200,
  color = colors.gold,
}: Props) {
  const [width, setWidth] = useState(320);
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (!values.length) return null;
    const g = geom(values, height, width);
    const n = values.length;
    const avg = mean(values);
    const { a, b } = linearTrend(values);

    const series = values.map((v, i) => ({ ...xy(g, i, v, n), v, i }));
    const points = series.map((p) => `${p.x},${p.y}`).join(' ');
    const avgY = xy(g, 0, avg, n).y;
    const trendStart = xy(g, 0, a, n);
    const trendEnd = xy(g, n - 1, a + b * (n - 1), n);

    const hTicks = g.ticks.map((v) => ({
      v,
      y: xy(g, 0, v, n).y,
    }));

    const vCount = Math.min(n, 5);
    const vLines = Array.from({ length: vCount }, (_, i) => {
      const idx = vCount === 1 ? 0 : Math.round((i / (vCount - 1)) * (n - 1));
      return { x: xy(g, idx, g.min, n).x, idx };
    });

    return {
      g,
      series,
      points,
      avg,
      avgY,
      trendStart,
      trendEnd,
      hTicks,
      vLines,
      slope: b,
      n,
    };
  }, [values, height, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - width) > 1) setWidth(w);
  };

  const scrubAt = (locationX: number) => {
    if (!chart) return;
    setActive(indexFromX(chart.g, locationX, chart.n));
  };

  if (!chart) {
    return <View style={[styles.empty, { height }]} />;
  }

  const avgColor = 'rgba(245, 240, 232, 0.55)';
  const trendColor = '#7EC8FF';
  const gridColor = 'rgba(255,255,255,0.10)';
  const activePoint = active != null ? chart.series[active] : null;
  const activeLabel =
    active != null ? labels?.[active] || `Game ${active + 1}` : null;

  return (
    <View>
      <View
        style={[styles.wrap, { height }]}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => scrubAt(e.nativeEvent.locationX)}
        onResponderMove={(e) => scrubAt(e.nativeEvent.locationX)}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
      >
        <Svg width={width} height={height}>
          {/* Plot background */}
          <Rect
            x={chart.g.padL}
            y={chart.g.padY}
            width={chart.g.innerW}
            height={chart.g.innerH}
            fill="rgba(0,0,0,0.15)"
          />

          {chart.hTicks.map((t, i) => (
            <Line
              key={`h${i}`}
              x1={chart.g.padL}
              y1={t.y}
              x2={chart.g.width - chart.g.padR}
              y2={t.y}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}
          {chart.vLines.map((v, i) => (
            <Line
              key={`v${i}`}
              x1={v.x}
              y1={chart.g.padY}
              x2={v.x}
              y2={chart.g.height - chart.g.padY}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}

          <Line
            x1={chart.g.padL}
            y1={chart.avgY}
            x2={chart.g.width - chart.g.padR}
            y2={chart.avgY}
            stroke={avgColor}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />

          <Line
            x1={chart.trendStart.x}
            y1={chart.trendStart.y}
            x2={chart.trendEnd.x}
            y2={chart.trendEnd.y}
            stroke={trendColor}
            strokeWidth={2}
            strokeLinecap="round"
          />

          <Polyline
            points={chart.points}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {chart.series.map((d) => (
            <Circle
              key={d.i}
              cx={d.x}
              cy={d.y}
              r={active === d.i ? 6 : 3.5}
              fill={active === d.i ? color : colors.navyLift}
              stroke={color}
              strokeWidth={2}
            />
          ))}

          {activePoint ? (
            <Line
              x1={activePoint.x}
              y1={chart.g.padY}
              x2={activePoint.x}
              y2={chart.g.height - chart.g.padY}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1.5}
            />
          ) : null}
        </Svg>

        {/* Y-axis labels (HTML overlay so text stays sharp) */}
        {chart.hTicks.map((t, i) => (
          <Text
            key={`yl${i}`}
            style={[
              styles.yLabel,
              {
                top: t.y - 7,
                width: chart.g.padL - 6,
              },
            ]}
          >
            {formatNum(t.v)}
          </Text>
        ))}

        {activePoint && activeLabel ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: Math.min(
                  Math.max(8, activePoint.x - 54),
                  Math.max(8, width - 116)
                ),
                top: Math.max(8, activePoint.y - 52),
              },
            ]}
          >
            <Text style={styles.tooltipLabel}>{activeLabel}</Text>
            <Text style={styles.tooltipValue}>{formatNum(activePoint.v)}</Text>
          </View>
        ) : null}

        {!activePoint ? (
          <Text style={styles.scrubHint}>Drag to scrub</Text>
        ) : null}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={styles.legendText}>Games</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatchDash, { borderColor: avgColor }]} />
          <Text style={styles.legendText}>Avg {formatNum(chart.avg)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: trendColor }]} />
          <Text style={styles.legendText}>
            Trend {chart.slope > 0.02 ? '↑' : chart.slope < -0.02 ? '↓' : '→'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.navyLift,
    overflow: 'hidden',
    position: 'relative',
  },
  empty: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.navyLift,
  },
  yLabel: {
    position: 'absolute',
    left: 0,
    textAlign: 'right',
    paddingRight: 4,
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 11,
  },
  tooltip: {
    position: 'absolute',
    minWidth: 100,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(10, 18, 32, 0.94)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tooltipLabel: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 11,
  },
  tooltipValue: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 22,
    marginTop: 2,
  },
  scrubHint: {
    position: 'absolute',
    right: 10,
    bottom: 8,
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 10 },
  swatchDash: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 12,
  },
});

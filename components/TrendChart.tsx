import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { colors } from '@/constants/theme';

type Props = {
  values: number[];
  height?: number;
  color?: string;
};

type ChartGeom = {
  width: number;
  height: number;
  padX: number;
  padY: number;
  innerW: number;
  innerH: number;
  min: number;
  max: number;
  span: number;
};

function geom(values: number[], height: number, width: number): ChartGeom {
  const padY = 18;
  const padX = 14;
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  // Give flat series a little room so avg/trend still read
  const pad = minRaw === maxRaw ? 1 : (maxRaw - minRaw) * 0.12;
  const min = minRaw - pad;
  const max = maxRaw + pad;
  return {
    width,
    height,
    padX,
    padY,
    innerW: width - padX * 2,
    innerH: height - padY * 2,
    min,
    max,
    span: max - min || 1,
  };
}

function xy(g: ChartGeom, i: number, v: number, n: number) {
  const x = g.padX + (n === 1 ? g.innerW / 2 : (i / (n - 1)) * g.innerW);
  const y = g.padY + g.innerH - ((v - g.min) / g.span) * g.innerH;
  return { x, y };
}

function mean(values: number[]) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Simple least-squares trend: y = a + b*x over index 0..n-1 */
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

/** Game-log chart with grid, average, trend, and markers. */
export function TrendChart({ values, height = 168, color = colors.gold }: Props) {
  const width = 320;

  const chart = useMemo(() => {
    if (!values.length) return null;
    const g = geom(values, height, width);
    const n = values.length;
    const avg = mean(values);
    const { a, b } = linearTrend(values);

    const series = values.map((v, i) => xy(g, i, v, n));
    const points = series.map((p) => `${p.x},${p.y}`).join(' ');
    const avgY = xy(g, 0, avg, n).y;
    const trendStart = xy(g, 0, a, n);
    const trendEnd = xy(g, n - 1, a + b * (n - 1), n);

    // 4 horizontal + vertical grid lines
    const hLines = [0, 0.33, 0.66, 1].map((t) => g.padY + g.innerH * (1 - t));
    const vCount = Math.min(n, 6);
    const vLines = Array.from({ length: vCount }, (_, i) => {
      const idx = vCount === 1 ? 0 : Math.round((i / (vCount - 1)) * (n - 1));
      return xy(g, idx, g.min, n).x;
    });

    return { g, series, points, avg, avgY, trendStart, trendEnd, hLines, vLines, slope: b };
  }, [values, height]);

  if (!chart) {
    return <View style={[styles.empty, { height }]} />;
  }

  const avgColor = 'rgba(245, 240, 232, 0.55)';
  const trendColor = '#7EC8FF';
  const gridColor = 'rgba(255,255,255,0.08)';

  return (
    <View>
      <View style={[styles.wrap, { height }]}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {chart.hLines.map((y, i) => (
            <Line
              key={`h${i}`}
              x1={chart.g.padX}
              y1={y}
              x2={chart.g.width - chart.g.padX}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}
          {chart.vLines.map((x, i) => (
            <Line
              key={`v${i}`}
              x1={x}
              y1={chart.g.padY}
              x2={x}
              y2={chart.g.height - chart.g.padY}
              stroke={gridColor}
              strokeWidth={1}
            />
          ))}

          {/* Average */}
          <Line
            x1={chart.g.padX}
            y1={chart.avgY}
            x2={chart.g.width - chart.g.padX}
            y2={chart.avgY}
            stroke={avgColor}
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />

          {/* Trend */}
          <Line
            x1={chart.trendStart.x}
            y1={chart.trendStart.y}
            x2={chart.trendEnd.x}
            y2={chart.trendEnd.y}
            stroke={trendColor}
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Actual series */}
          <Polyline
            points={chart.points}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {chart.series.map((d, i) => (
            <Circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={4}
              fill={colors.navyLift}
              stroke={color}
              strokeWidth={2}
            />
          ))}
        </Svg>
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

function formatNum(n: number) {
  if (Number.isInteger(n)) return String(n);
  return (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '') || '0';
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

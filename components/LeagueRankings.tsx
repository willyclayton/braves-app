import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Platform, StyleSheet, Text, UIManager, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import type { StatRanking } from '@/data/types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Rank 1 → 100th percentile; last place → 0th. */
export function percentileFromRank(rank: number | null | undefined, of: number | null | undefined) {
  if (rank == null || of == null || of < 1) return null;
  if (of === 1) return 100;
  return Math.round(((of - rank) / (of - 1)) * 100);
}

/** Savant-style cool→warm scale (poor blue → great red). */
export function percentileColor(pct: number) {
  if (pct >= 90) return '#C41E3A';
  if (pct >= 75) return '#E04A5A';
  if (pct >= 60) return '#E88A8A';
  if (pct >= 45) return '#A8B0BC';
  if (pct >= 30) return '#7BA3C9';
  if (pct >= 15) return '#3D6FA8';
  return '#1E4A7A';
}

function rankLine(row: StatRanking) {
  const bits: string[] = [];
  if (row.mlb != null) {
    bits.push(`MLB ${ordinal(row.mlb)}${row.mlbOf ? `/${row.mlbOf}` : ''}`);
  }
  if (row.nl != null) {
    bits.push(`NL ${ordinal(row.nl)}${row.nlOf ? `/${row.nlOf}` : ''}`);
  }
  return bits.join(' · ');
}

type Props = {
  rankings?: StatRanking[];
  playerName: string;
};

function PercentileRow({
  row,
  delay,
}: {
  row: StatRanking;
  delay: number;
}) {
  const pct = percentileFromRank(row.mlb, row.mlbOf ?? null);
  const width = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);
  const color = pct == null ? colors.mistDim : percentileColor(pct);
  const fillPct = pct == null ? 0 : Math.max(2, Math.min(100, pct));

  useEffect(() => {
    if (!trackW) return;
    width.setValue(0);
    Animated.timing(width, {
      toValue: (fillPct / 100) * trackW,
      duration: 520,
      delay,
      useNativeDriver: false,
    }).start();
  }, [trackW, fillPct, delay, width]);

  return (
    <View style={styles.row}>
      <View style={styles.rowTop}>
        <Text style={styles.statLabel}>{row.label}</Text>
        <View style={styles.barCol}>
          <View
            style={styles.track}
            onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
          >
            <View style={[styles.guide, styles.guide25]} />
            <View style={[styles.guide, styles.guide50]} />
            <View style={[styles.guide, styles.guide75]} />
            {pct == null ? (
              <View style={styles.nqBar}>
                <Text style={styles.nqText}>NOT QUALIFIED</Text>
              </View>
            ) : (
              <Animated.View style={[styles.fill, { width, backgroundColor: color }]}>
                <View style={[styles.bubble, { borderColor: color, backgroundColor: color }]}>
                  <Text style={styles.bubbleText}>{pct}</Text>
                </View>
              </Animated.View>
            )}
          </View>
        </View>
        <Text style={styles.statValue}>{row.value}</Text>
      </View>
      <Text style={styles.rankMeta}>{rankLine(row) || '—'}</Text>
    </View>
  );
}

export function LeagueRankings({ rankings = [], playerName }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReady(true);
  }, []);

  if (!rankings.length) return null;

  const scored = rankings
    .map((r) => ({ r, pct: percentileFromRank(r.mlb, r.mlbOf ?? null) }))
    .filter((x) => x.pct != null) as { r: StatRanking; pct: number }[];
  const avgPct =
    scored.length > 0
      ? Math.round(scored.reduce((a, x) => a + x.pct, 0) / scored.length)
      : null;
  const elite = scored.filter((x) => x.pct >= 90).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Percentile rankings</Text>
          <View style={styles.titleRule} />
          <Text style={styles.subtitle} numberOfLines={2}>
            {avgPct != null
              ? `${playerName} · MLB avg ${ordinal(avgPct)}${elite ? ` · ${elite} elite` : ''}`
              : `Season vs MLB · ${playerName}`}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: '#3D6FA8' }]}>POOR</Text>
        <View style={styles.legendBar}>
          {[0, 20, 40, 55, 70, 85, 95].map((p) => (
            <View key={p} style={[styles.legendSeg, { backgroundColor: percentileColor(p) }]} />
          ))}
        </View>
        <Text style={[styles.legendLabel, { color: '#C41E3A' }]}>GREAT</Text>
      </View>

      <View style={styles.scaleRow}>
        <Text style={styles.scaleTick}>0</Text>
        <Text style={styles.scaleTick}>25</Text>
        <Text style={[styles.scaleTick, styles.scaleAvg]}>AVG</Text>
        <Text style={styles.scaleTick}>75</Text>
        <Text style={styles.scaleTick}>100</Text>
      </View>

      <View style={styles.body}>
        {ready
          ? rankings.map((row, i) => (
              <PercentileRow key={row.key} row={row} delay={40 + i * 45} />
            ))
          : null}
      </View>

      <Text style={styles.footnote}>
        MLB percentile from season rank among qualified players. Rate stats use batting-title /
        ERA-title pace (3.1 PA or 1 IP per team game). NL rank shown under each bar.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: 'rgba(26, 47, 85, 0.55)',
    overflow: 'hidden',
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 10,
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  titleRule: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2EC4B6',
    marginTop: 6,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  legendLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 9,
    letterSpacing: 1.1,
  },
  legendBar: {
    flex: 1,
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  legendSeg: { flex: 1 },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 70,
    paddingRight: 74,
    marginBottom: 6,
  },
  scaleTick: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 9,
    letterSpacing: 0.4,
  },
  scaleAvg: { color: colors.mist },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  row: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    width: 48,
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 12,
  },
  barCol: { flex: 1, minWidth: 0 },
  track: {
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  guide: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  guide25: { left: '25%' },
  guide50: { left: '50%', backgroundColor: 'rgba(255,255,255,0.28)' },
  guide75: { left: '75%' },
  fill: {
    height: 22,
    borderRadius: 11,
    minWidth: 22,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  bubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -1,
  },
  bubbleText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 9,
    letterSpacing: -0.2,
  },
  nqBar: {
    ...StyleSheet.absoluteFill,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nqText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 9,
    letterSpacing: 1,
  },
  statValue: {
    width: 52,
    textAlign: 'right',
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 20,
    letterSpacing: 0.3,
  },
  rankMeta: {
    marginTop: 4,
    marginLeft: 56,
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
  },
  footnote: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    lineHeight: 16,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
});

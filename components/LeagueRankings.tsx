import { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
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

function rankTone(rank: number | null) {
  if (rank == null) return styles.rankMuted;
  if (rank <= 3) return styles.rankGold;
  if (rank <= 10) return styles.rankBright;
  return styles.rankDefault;
}

type Props = {
  rankings?: StatRanking[];
  playerName: string;
};

export function LeagueRankings({ rankings = [], playerName }: Props) {
  const [open, setOpen] = useState(false);

  if (!rankings.length) return null;

  const topBits = rankings
    .filter((r) => (r.mlb != null && r.mlb <= 5) || (r.nl != null && r.nl <= 5))
    .slice(0, 3)
    .map((r) => {
      const place = r.mlb != null && r.mlb <= 5 ? r.mlb : r.nl;
      return `${r.label} ${ordinal(place!)}`;
    });

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>League rankings</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {open
              ? `Season ranks · ${playerName}`
              : topBits.length
                ? topBits.join(' · ')
                : 'MLB & National League'}
          </Text>
        </View>
        <Text style={styles.chevron}>{open ? '▾' : '▸'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.body}>
          <View style={styles.colHead}>
            <Text style={[styles.colLabel, styles.colStat]}>STAT</Text>
            <Text style={[styles.colLabel, styles.colVal]}>VALUE</Text>
            <Text style={[styles.colLabel, styles.colRank]}>MLB</Text>
            <Text style={[styles.colLabel, styles.colRank]}>NL</Text>
          </View>
          {rankings.map((row) => (
            <View key={row.key} style={styles.row}>
              <Text style={[styles.statLabel, styles.colStat]}>{row.label}</Text>
              <Text style={[styles.statValue, styles.colVal]}>{row.value}</Text>
              <Text style={[styles.rank, styles.colRank, rankTone(row.mlb)]}>
                {row.mlb != null ? ordinal(row.mlb) : '—'}
              </Text>
              <Text style={[styles.rank, styles.colRank, rankTone(row.nl)]}>
                {row.nl != null ? ordinal(row.nl) : '—'}
              </Text>
            </View>
          ))}
          <Text style={styles.footnote}>
            Season totals vs MLB and the National League. Rate stats use batting-title / ERA-title
            pace (3.1 PA or 1 IP per team game).
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: 'rgba(26, 47, 85, 0.45)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  headerPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 3,
  },
  chevron: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 16,
    width: 18,
    textAlign: 'center',
  },
  body: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingBottom: 12,
  },
  colHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  colLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  colStat: { width: 56 },
  colVal: { flex: 1, textAlign: 'right', paddingRight: 12 },
  colRank: { width: 52, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  statLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 13,
  },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  rank: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
  },
  rankGold: { color: colors.gold },
  rankBright: { color: colors.cream },
  rankDefault: { color: colors.white },
  rankMuted: { color: colors.mistDim },
  footnote: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
});

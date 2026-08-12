import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { divisions, wildCards, type StandingRow } from '@/data/braves';

type Mode = 'east' | 'wildcard' | 'overall';

function StandingTable({
  title,
  rows,
  gapKey = 'gb',
  gapLabel = 'GB',
}: {
  title: string;
  rows: StandingRow[];
  gapKey?: 'gb' | 'wcgb';
  gapLabel?: string;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.headCell, styles.teamCol]}>TEAM</Text>
        <Text style={styles.headCell}>W</Text>
        <Text style={styles.headCell}>L</Text>
        <Text style={styles.headCell}>PCT</Text>
        <Text style={styles.headCell}>{gapLabel}</Text>
      </View>
      {rows.map((row, i) => (
        <View key={row.abbr} style={[styles.row, row.highlight && styles.rowHot]}>
          <View style={[styles.teamCol, styles.teamCell]}>
            <Text style={[styles.rank, row.highlight && styles.rankHot]}>{i + 1}</Text>
            <TeamLogo abbr={row.abbr} size={28} />
            <View>
              <Text style={[styles.team, row.highlight && styles.teamHot]}>{row.abbr}</Text>
              <Text style={styles.streak}>{row.streak}</Text>
            </View>
          </View>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.w}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.l}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.pct}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>
            {gapKey === 'wcgb' ? row.wcgb ?? '—' : row.gb}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function StandingsScreen() {
  const [mode, setMode] = useState<Mode>('east');

  const nlEast = useMemo(
    () => divisions.find((d) => d.league === 'NL' && d.division.includes('East')),
    []
  );

  const nlWild = useMemo(() => wildCards.find((w) => w.league === 'NL'), []);

  const nlOverall = useMemo(() => {
    const teams = divisions
      .filter((d) => d.league === 'NL')
      .flatMap((d) => d.teams)
      .slice()
      .sort((a, b) => {
        const pct = parseFloat(b.pct) - parseFloat(a.pct);
        if (pct !== 0) return pct;
        return b.w - a.w;
      });
    // GB vs NL leader
    const leader = teams[0];
    return teams.map((t) => {
      if (!leader || t.abbr === leader.abbr) return { ...t, gb: '—' };
      const gamesBack = (leader.w - t.w + (t.l - leader.l)) / 2;
      return {
        ...t,
        gb: gamesBack <= 0 ? '—' : gamesBack.toFixed(gamesBack % 1 === 0 ? 0 : 1),
      };
    });
  }, []);

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>NL</Text>
        <Text style={styles.title}>Standings</Text>
      </FadeIn>

      <View style={styles.segRow}>
        {(
          [
            ['east', 'NL East'],
            ['wildcard', 'Wildcard'],
            ['overall', 'Overall'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setMode(key)}
            style={[styles.seg, mode === key && styles.segOn]}
          >
            <Text style={[styles.segText, mode === key && styles.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {mode === 'east' ? (
        <StandingTable title="NL East" rows={nlEast?.teams || []} />
      ) : null}

      {mode === 'wildcard' ? (
        <StandingTable
          title="NL Wild Card"
          rows={nlWild?.teams || []}
          gapKey="wcgb"
          gapLabel="WC"
        />
      ) : null}

      {mode === 'overall' ? (
        <StandingTable title="NL Overall" rows={nlOverall} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2.5,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 48,
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  segRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
  },
  segOn: {
    backgroundColor: colors.scarlet,
    borderColor: colors.scarlet,
  },
  segText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 12,
  },
  segTextOn: { color: colors.white },
  block: { marginTop: spacing.md },
  blockTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 24,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headCell: {
    width: 40,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1,
  },
  teamCol: { flex: 1, paddingRight: 8 },
  teamCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowHot: {
    backgroundColor: 'rgba(206, 17, 65, 0.12)',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomColor: 'transparent',
  },
  rank: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.mistDim,
    fontSize: 16,
    width: 16,
  },
  rankHot: { color: colors.gold },
  team: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 14,
  },
  teamHot: { color: colors.cream },
  streak: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 10,
  },
  cell: {
    width: 40,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
  },
  cellHot: {
    color: colors.white,
    fontFamily: 'DMSans_700Bold',
  },
});

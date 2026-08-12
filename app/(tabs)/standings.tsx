import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { divisions, type StandingRow } from '@/data/braves';

type Mode = 'east' | 'wildcard' | 'overall';

type DisplayRow = StandingRow & { badge?: string; leagueTag?: string };

function sortByRecord(teams: StandingRow[]) {
  return [...teams].sort((a, b) => {
    const pct = parseFloat(b.pct) - parseFloat(a.pct);
    if (pct !== 0) return pct;
    return b.w - a.w;
  });
}

function withGamesBack(teams: StandingRow[]): StandingRow[] {
  const leader = teams[0];
  return teams.map((t) => {
    if (!leader || t.abbr === leader.abbr) return { ...t, gb: '—' };
    const gamesBack = (leader.w - t.w + (t.l - leader.l)) / 2;
    return {
      ...t,
      gb: gamesBack <= 0 ? '—' : gamesBack.toFixed(gamesBack % 1 === 0 ? 0 : 1),
    };
  });
}

function StandingTable({
  title,
  rows,
  gapKey = 'gb',
  gapLabel = 'GB',
  cutoffAfter,
  showLeague,
}: {
  title: string;
  rows: DisplayRow[];
  gapKey?: 'gb' | 'wcgb';
  gapLabel?: string;
  cutoffAfter?: number;
  showLeague?: boolean;
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
        <View key={`${row.abbr}-${i}`}>
          {cutoffAfter != null && i === cutoffAfter ? (
            <View style={styles.cutoff}>
              <View style={styles.cutoffLine} />
              <Text style={styles.cutoffLabel}>CUTOFF</Text>
              <View style={styles.cutoffLine} />
            </View>
          ) : null}
          <View style={[styles.row, row.highlight && styles.rowHot]}>
            <View style={[styles.teamCol, styles.teamCell]}>
              <Text style={[styles.rank, row.highlight && styles.rankHot]}>{i + 1}</Text>
              <TeamLogo abbr={row.abbr} size={28} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.teamNameRow}>
                  <Text style={[styles.team, row.highlight && styles.teamHot]}>{row.abbr}</Text>
                  {row.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{row.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.streak}>
                  {row.streak}
                  {showLeague && row.leagueTag ? ` · ${row.leagueTag}` : ''}
                </Text>
              </View>
            </View>
            <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.w}</Text>
            <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.l}</Text>
            <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.pct}</Text>
            <Text style={[styles.cell, row.highlight && styles.cellHot]}>
              {gapKey === 'wcgb' ? row.wcgb ?? '—' : row.gb}
            </Text>
          </View>
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

  const nlLeaders = useMemo(() => {
    const leaders = divisions
      .filter((d) => d.league === 'NL')
      .map((d) => {
        const top = d.teams[0];
        const letter = d.division.charAt(0).toUpperCase();
        return { ...top, badge: letter } as DisplayRow;
      });
    return withGamesBack(sortByRecord(leaders)) as DisplayRow[];
  }, []);

  const nlWild = useMemo(() => {
    const leaderAbbrs = new Set(
      divisions.filter((d) => d.league === 'NL').map((d) => d.teams[0]?.abbr)
    );
    const rest = divisions
      .filter((d) => d.league === 'NL')
      .flatMap((d) => d.teams.slice(1));
    return sortByRecord(rest).filter((t) => !leaderAbbrs.has(t.abbr));
  }, []);

  const mlbOverall = useMemo(() => {
    const teams = divisions.flatMap((d) =>
      d.teams.map(
        (t) =>
          ({
            ...t,
            leagueTag: d.league,
          }) as DisplayRow
      )
    );
    return withGamesBack(sortByRecord(teams)) as DisplayRow[];
  }, []);

  const nlOverall = useMemo(() => {
    const teams = divisions.filter((d) => d.league === 'NL').flatMap((d) => d.teams);
    return withGamesBack(sortByRecord(teams));
  }, []);

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>{mode === 'overall' ? 'MLB' : 'NL'}</Text>
        <Text style={styles.title}>Standings</Text>
      </FadeIn>

      <View style={styles.segRow}>
        {(
          [
            ['east', 'NL East'],
            ['wildcard', 'Wildcard'],
            ['overall', 'MLB'],
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
        <>
          <StandingTable title="Division leaders" rows={nlLeaders} />
          <StandingTable
            title="NL Wild Card"
            rows={nlWild}
            gapKey="wcgb"
            gapLabel="WC"
            cutoffAfter={3}
          />
        </>
      ) : null}

      {mode === 'overall' ? (
        <>
          <StandingTable title="MLB Overall" rows={mlbOverall} showLeague />
          <StandingTable title="NL Overall" rows={nlOverall} />
        </>
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
    fontSize: 13,
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
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 0.8,
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
  teamNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  team: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 14,
  },
  teamHot: { color: colors.cream },
  badge: {
    backgroundColor: 'rgba(234, 170, 0, 0.18)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  streak: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 11,
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
  cutoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  cutoffLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.gold,
    opacity: 0.45,
  },
  cutoffLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
});

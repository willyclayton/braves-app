import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { divisions, wildCards } from '@/data/braves';

type League = 'NL' | 'AL';
type Mode = 'division' | 'wildcard';

export default function StandingsScreen() {
  const [league, setLeague] = useState<League>('NL');
  const [mode, setMode] = useState<Mode>('division');

  const divisionBoards = useMemo(
    () => divisions.filter((d) => d.league === league),
    [league]
  );
  const wildBoard = useMemo(
    () => wildCards.find((w) => w.league === league),
    [league]
  );

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>MLB</Text>
        <Text style={styles.title}>Standings</Text>
      </FadeIn>

      <View style={styles.segRow}>
        {(['NL', 'AL'] as League[]).map((l) => (
          <Pressable
            key={l}
            onPress={() => setLeague(l)}
            style={[styles.seg, league === l && styles.segOn]}
          >
            <Text style={[styles.segText, league === l && styles.segTextOn]}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.segRow}>
        {(
          [
            ['division', 'Division'],
            ['wildcard', 'Wild Card'],
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

      {mode === 'division'
        ? divisionBoards.map((board) => (
            <View key={`${board.league}-${board.division}`} style={styles.block}>
              <Text style={styles.blockTitle}>
                {board.league} {board.division}
              </Text>
              <View style={styles.tableHead}>
                <Text style={[styles.headCell, styles.teamCol]}>TEAM</Text>
                <Text style={styles.headCell}>W</Text>
                <Text style={styles.headCell}>L</Text>
                <Text style={styles.headCell}>PCT</Text>
                <Text style={styles.headCell}>GB</Text>
              </View>
              {board.teams.map((row, i) => (
                <View
                  key={row.abbr}
                  style={[styles.row, row.highlight && styles.rowHot]}
                >
                  <View style={[styles.teamCol, styles.teamCell]}>
                    <Text style={[styles.rank, row.highlight && styles.rankHot]}>{i + 1}</Text>
                    <TeamLogo abbr={row.abbr} size={28} />
                    <View>
                      <Text style={[styles.team, row.highlight && styles.teamHot]}>
                        {row.abbr}
                      </Text>
                      <Text style={styles.streak}>{row.streak}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.w}</Text>
                  <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.l}</Text>
                  <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.pct}</Text>
                  <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.gb}</Text>
                </View>
              ))}
            </View>
          ))
        : (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>{league} Wild Card</Text>
            <View style={styles.tableHead}>
              <Text style={[styles.headCell, styles.teamCol]}>TEAM</Text>
              <Text style={styles.headCell}>W</Text>
              <Text style={styles.headCell}>L</Text>
              <Text style={styles.headCell}>PCT</Text>
              <Text style={styles.headCell}>WC</Text>
            </View>
            {(wildBoard?.teams || []).map((row, i) => (
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
                  {row.wcgb ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        )}
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
  block: { marginTop: spacing.lg },
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

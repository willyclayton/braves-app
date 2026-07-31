import { StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { standings, teamPulse } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

export default function StandingsScreen() {
  const { screenTitle } = usePhoneLayout();

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>NL EAST</Text>
        <Text style={[styles.title, { fontSize: screenTitle }]}>Standings</Text>
        <Text style={styles.sub}>
          Braves {teamPulse.record} · {teamPulse.rank}
        </Text>
      </FadeIn>

      <FadeIn delay={80} style={styles.tableHead}>
        <Text style={[styles.headCell, styles.teamCol]}>TEAM</Text>
        <Text style={styles.headCell}>W</Text>
        <Text style={styles.headCell}>L</Text>
        <Text style={styles.headCell}>PCT</Text>
        <Text style={styles.headCell}>GB</Text>
      </FadeIn>

      {standings.map((row, i) => (
        <FadeIn
          key={row.abbr}
          delay={120 + i * 50}
          style={[styles.row, row.highlight && styles.rowHot]}
        >
          <View style={[styles.teamCol, styles.teamCell]}>
            <Text style={[styles.rank, row.highlight && styles.rankHot]}>{i + 1}</Text>
            <TeamLogo abbr={row.abbr} size={30} />
            <View>
              <Text style={[styles.team, row.highlight && styles.teamHot]}>{row.abbr}</Text>
              <Text style={styles.streak}>{row.streak}</Text>
            </View>
          </View>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.w}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.l}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.pct}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.gb}</Text>
        </FadeIn>
      ))}
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
    letterSpacing: 1,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
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
  teamCol: {
    flex: 1,
    paddingRight: 8,
  },
  teamCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
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
    fontSize: 18,
    width: 16,
  },
  rankHot: { color: colors.gold },
  team: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  teamHot: { color: colors.cream },
  streak: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
    marginTop: 1,
  },
  cell: {
    width: 40,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 14,
  },
  cellHot: {
    color: colors.white,
    fontFamily: 'DMSans_700Bold',
  },
});

import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { standings, teamPulse } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

function StandingBar({ pct, highlight, delay }: { pct: string; highlight?: boolean; delay: number }) {
  const progress = useSharedValue(0);
  const target = Math.round(parseFloat(pct) * 100);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(target, { duration: 700 }));
  }, [delay, target, progress]);

  const style = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          highlight && styles.barFillHot,
          style,
        ]}
      />
    </View>
  );
}

export default function StandingsScreen() {
  const { screenTitle } = usePhoneLayout();

  return (
    <Screen contentStyle={styles.content}>
      <FadeIn>
        <Text style={styles.kicker}>NL EAST</Text>
        <Text style={[styles.title, { fontSize: screenTitle }]}>Standings</Text>
        <Text style={styles.sub}>
          Braves hold {teamPulse.rank.split(' · ')[0]} with a {teamPulse.record} mark.
        </Text>
      </FadeIn>

      <FadeIn delay={100} style={styles.tableHead}>
        <Text style={[styles.headCell, styles.teamCol]}>TEAM</Text>
        <Text style={styles.headCell}>W</Text>
        <Text style={styles.headCell}>L</Text>
        <Text style={styles.headCell}>PCT</Text>
        <Text style={styles.headCell}>GB</Text>
      </FadeIn>

      {standings.map((row, i) => (
        <FadeIn
          key={row.abbr}
          delay={140 + i * 70}
          style={[styles.row, row.highlight && styles.rowHot]}
        >
          <View style={styles.teamCol}>
            <View style={styles.teamLine}>
              <Text style={[styles.rank, row.highlight && styles.rankHot]}>{i + 1}</Text>
              <View>
                <Text style={[styles.team, row.highlight && styles.teamHot]}>{row.abbr}</Text>
                <Text style={styles.streak}>{row.streak}</Text>
              </View>
            </View>
            <StandingBar pct={row.pct} highlight={row.highlight} delay={220 + i * 80} />
          </View>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.w}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.l}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.pct}</Text>
          <Text style={[styles.cell, row.highlight && styles.cellHot]}>{row.gb}</Text>
        </FadeIn>
      ))}

      <FadeIn delay={560} style={styles.note}>
        <Text style={styles.noteTitle}>Division grip</Text>
        <Text style={styles.noteBody}>
          Seven games clear of Philadelphia. Walt Weiss’s club owns the NL East — protect the lead through August.
        </Text>
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
  },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 3,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 52,
    letterSpacing: 1,
    marginTop: 4,
  },
  sub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 15,
    marginTop: 4,
    marginBottom: spacing.xl,
  },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 4,
  },
  headCell: {
    width: 40,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 1,
  },
  teamCol: {
    flex: 1,
    width: undefined,
    textAlign: 'left',
    paddingRight: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowHot: {
    backgroundColor: 'rgba(206, 17, 65, 0.12)',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    borderBottomColor: 'transparent',
  },
  teamLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  rank: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.mistDim,
    fontSize: 22,
    width: 18,
  },
  rankHot: {
    color: colors.gold,
  },
  team: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 16,
  },
  teamHot: {
    color: colors.cream,
  },
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
  barTrack: {
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  barFill: {
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(245,240,232,0.35)',
  },
  barFillHot: {
    backgroundColor: colors.scarlet,
  },
  note: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  noteTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 24,
    marginBottom: 6,
  },
  noteBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 15,
    lineHeight: 22,
  },
});

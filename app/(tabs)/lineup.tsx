import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { nextGame, pitchingToday, todayLineup } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

export default function LineupScreen() {
  const { screenTitle } = usePhoneLayout();

  return (
    <Screen contentStyle={styles.content}>
      <FadeIn>
        <Text style={styles.kicker}>TODAY</Text>
        <Text style={[styles.title, { fontSize: screenTitle }]}>Lineup</Text>
        <Text style={styles.sub}>
          {nextGame.home ? 'vs' : '@'} {nextGame.opponent} · {nextGame.date}
        </Text>
      </FadeIn>

      <FadeIn delay={100} style={styles.pitcherCard}>
        <Text style={styles.pitcherLabel}>STARTING PITCHER</Text>
        <View style={styles.pitcherRow}>
          <View style={styles.numBubble}>
            <Text style={styles.num}>{pitchingToday.starter.number}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pitcherName}>{pitchingToday.starter.name}</Text>
            <Text style={styles.pitcherMeta}>
              {pitchingToday.starter.era} ERA · {pitchingToday.starter.whip} WHIP ·{' '}
              {pitchingToday.starter.so} K
            </Text>
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={180} style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Batting order</Text>
      </FadeIn>

      {todayLineup.map((player, i) => (
        <FadeIn key={player.name} delay={220 + i * 55} style={styles.row}>
          <Text style={styles.order}>{i + 1}</Text>
          <View style={styles.numBubbleSm}>
            <Text style={styles.numSm}>{player.number}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerMeta}>
              {player.avg} AVG · {player.ops} OPS · {player.hr} HR
            </Text>
          </View>
          <Text style={styles.pos}>{player.pos}</Text>
        </FadeIn>
      ))}

      <FadeIn delay={760} style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Bullpen watch</Text>
      </FadeIn>

      {pitchingToday.bullpen.map((p, i) => (
        <FadeIn key={p.name} delay={800 + i * 60} style={styles.bullpenRow}>
          <Text style={styles.bullpenPos}>{p.pos}</Text>
          <Text style={styles.bullpenName}>{p.name}</Text>
          <Text style={styles.bullpenStat}>{p.era} ERA</Text>
        </FadeIn>
      ))}
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
    marginBottom: spacing.lg,
  },
  pitcherCard: {
    backgroundColor: 'rgba(206, 17, 65, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(206, 17, 65, 0.35)',
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  pitcherLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  pitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  numBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
  },
  pitcherName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 20,
  },
  pitcherMeta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginTop: 3,
  },
  sectionHead: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 28,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 10,
  },
  order: {
    width: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.mistDim,
    fontSize: 20,
  },
  numBubbleSm: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.navyLift,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numSm: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.cream,
    fontSize: 18,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  playerMeta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 2,
  },
  pos: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.gold,
    fontSize: 18,
    minWidth: 28,
    textAlign: 'right',
  },
  bullpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 12,
  },
  bullpenPos: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.scarletSoft,
    fontSize: 18,
    width: 28,
  },
  bullpenName: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    color: colors.white,
    fontSize: 15,
  },
  bullpenStat: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
  },
});

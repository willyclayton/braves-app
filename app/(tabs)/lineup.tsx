import { StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { nextGame, pitchingToday, todayLineup } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

export default function LineupScreen() {
  const { screenTitle } = usePhoneLayout();

  return (
    <Screen>
      <FadeIn>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>TODAY</Text>
            <Text style={[styles.title, { fontSize: screenTitle }]}>Lineup</Text>
          </View>
          <TeamLogo abbr={nextGame.opponentAbbr} size={44} />
        </View>
        <Text style={styles.sub}>
          {nextGame.home ? 'vs' : '@'} {nextGame.opponent} · {nextGame.date}
        </Text>
      </FadeIn>

      <FadeIn delay={80} style={styles.spRow}>
        <View style={styles.numBubble}>
          <Text style={styles.num}>{pitchingToday.starter.number}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.spLabel}>STARTING PITCHER</Text>
          <Text style={styles.spName}>{pitchingToday.starter.name}</Text>
          <Text style={styles.spMeta}>
            {pitchingToday.starter.era} ERA · {pitchingToday.starter.whip} WHIP ·{' '}
            {pitchingToday.starter.so} K
          </Text>
        </View>
      </FadeIn>

      <Text style={styles.section}>Batting order</Text>
      {todayLineup.map((player, i) => (
        <FadeIn key={player.name} delay={120 + i * 40} style={styles.row}>
          <Text style={styles.order}>{i + 1}</Text>
          <View style={styles.numBubbleSm}>
            <Text style={styles.numSm}>{player.number}</Text>
          </View>
          <View style={styles.playerInfo}>
            <Text style={styles.playerName}>{player.name}</Text>
            <Text style={styles.playerMeta}>
              {player.avg} · {player.ops} OPS · {player.hr} HR
            </Text>
          </View>
          <Text style={styles.pos}>{player.pos}</Text>
        </FadeIn>
      ))}

      <Text style={styles.section}>Bullpen</Text>
      {pitchingToday.bullpen.map((p, i) => (
        <FadeIn key={p.name} delay={500 + i * 40} style={styles.bullpenRow}>
          <Text style={styles.bullpenPos}>{p.pos}</Text>
          <Text style={styles.bullpenName}>{p.name}</Text>
          <Text style={styles.bullpenStat}>{p.era} ERA</Text>
        </FadeIn>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
    marginBottom: spacing.lg,
  },
  spRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  numBubble: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
  },
  spLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  spName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 18,
    marginTop: 2,
  },
  spMeta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginTop: 28,
    marginBottom: 8,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 24,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 10,
  },
  order: {
    width: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.mistDim,
    fontSize: 18,
  },
  numBubbleSm: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.navyLift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numSm: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.cream,
    fontSize: 16,
  },
  playerInfo: { flex: 1 },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 12,
  },
  bullpenPos: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.scarletSoft,
    fontSize: 16,
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

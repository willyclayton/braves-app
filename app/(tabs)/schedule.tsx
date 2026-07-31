import { StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { schedule } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

function resultLabel(braves?: number, opp?: number) {
  if (braves == null || opp == null) return null;
  if (braves > opp) return { text: 'W', win: true };
  if (braves < opp) return { text: 'L', win: false };
  return { text: 'T', win: false };
}

export default function ScheduleScreen() {
  const { screenTitle, compact } = usePhoneLayout();

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>CALENDAR</Text>
        <Text style={[styles.title, { fontSize: screenTitle }]}>Schedule</Text>
        <Text style={styles.sub}>Results and upcoming games</Text>
      </FadeIn>

      {schedule.map((game, i) => {
        const result = resultLabel(game.bravesScore, game.oppScore);
        const upcoming = game.status === 'upcoming';

        return (
          <FadeIn key={game.id} delay={70 + i * 35} style={styles.row}>
            <View style={styles.left}>
              <Text style={styles.date}>{game.date}</Text>
              <Text style={styles.time}>{game.time}</Text>
            </View>

            <TeamLogo abbr={game.opponentAbbr} size={compact ? 30 : 34} />

            <View style={styles.mid}>
              <Text style={[styles.matchup, compact && styles.matchupCompact]}>
                {game.home ? 'vs' : '@'} {game.opponentAbbr}
              </Text>
              <Text style={styles.venue} numberOfLines={1}>
                {game.venue}
                {game.starter ? ` · ${game.starter}` : ''}
              </Text>
            </View>

            <View style={styles.right}>
              {result ? (
                <>
                  <Text style={[styles.result, result.win ? styles.win : styles.loss]}>
                    {result.text}
                  </Text>
                  <Text style={styles.score}>
                    {game.bravesScore}-{game.oppScore}
                  </Text>
                </>
              ) : (
                <Text style={styles.up}>{upcoming ? 'UP' : '—'}</Text>
              )}
            </View>
          </FadeIn>
        );
      })}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 10,
  },
  left: { width: 54 },
  date: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 13,
  },
  time: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
    marginTop: 2,
  },
  mid: { flex: 1 },
  matchup: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 24,
    letterSpacing: 0.5,
  },
  matchupCompact: { fontSize: 20 },
  venue: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 48,
  },
  result: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
  },
  win: { color: colors.success },
  loss: { color: colors.danger },
  score: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 12,
    marginTop: -2,
  },
  up: {
    fontFamily: 'DMSans_700Bold',
    color: colors.scarletSoft,
    fontSize: 12,
    letterSpacing: 1,
  },
});

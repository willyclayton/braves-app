import { StyleSheet, Text, View } from 'react-native';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { schedule } from '@/data/braves';

function resultLabel(braves?: number, opp?: number) {
  if (braves == null || opp == null) return null;
  if (braves > opp) return { text: 'W', win: true };
  if (braves < opp) return { text: 'L', win: false };
  return { text: 'T', win: false };
}

export default function ScheduleScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <FadeIn>
        <Text style={styles.kicker}>CALENDAR</Text>
        <Text style={styles.title}>Schedule</Text>
        <Text style={styles.sub}>Recent results and the road ahead.</Text>
      </FadeIn>

      {schedule.map((game, i) => {
        const result = resultLabel(game.bravesScore, game.oppScore);
        const upcoming = game.status === 'upcoming';

        return (
          <FadeIn
            key={game.id}
            delay={90 + i * 55}
            style={[styles.card, upcoming && styles.cardUpcoming]}
          >
            <View style={styles.left}>
              <Text style={styles.date}>{game.date}</Text>
              <Text style={styles.time}>{game.time}</Text>
            </View>

            <View style={styles.mid}>
              <Text style={styles.matchup}>
                {game.home ? 'vs' : '@'} {game.opponentAbbr}
              </Text>
              <Text style={styles.venue}>{game.venue}</Text>
              {game.tv || game.starter ? (
                <Text style={styles.meta}>
                  {[game.starter && `SP ${game.starter}`, game.tv].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
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
                <View style={styles.pill}>
                  <Text style={styles.pillText}>UP</Text>
                </View>
              )}
            </View>
          </FadeIn>
        );
      })}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 12,
  },
  cardUpcoming: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderBottomColor: 'transparent',
    marginBottom: 6,
  },
  left: {
    width: 58,
  },
  date: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 14,
  },
  time: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 3,
  },
  mid: {
    flex: 1,
  },
  matchup: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
    letterSpacing: 0.5,
  },
  venue: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginTop: 1,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 3,
  },
  right: {
    alignItems: 'flex-end',
    minWidth: 48,
  },
  result: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
  },
  win: {
    color: colors.success,
  },
  loss: {
    color: colors.danger,
  },
  score: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
    marginTop: -2,
  },
  pill: {
    backgroundColor: colors.scarlet,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  pillText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 11,
    letterSpacing: 1,
  },
});

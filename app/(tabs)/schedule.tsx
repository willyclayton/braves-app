import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { schedule } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Filter = 'all' | 'upcoming' | 'final';

function resultLabel(braves?: number, opp?: number) {
  if (braves == null || opp == null) return null;
  if (braves > opp) return { text: 'W', win: true };
  if (braves < opp) return { text: 'L', win: false };
  return { text: 'T', win: false };
}

export default function ScheduleScreen() {
  const { screenTitle, compact } = usePhoneLayout();
  const [filter, setFilter] = useState<Filter>('all');

  const games = useMemo(() => {
    if (filter === 'all') return schedule;
    return schedule.filter((g) => g.status === filter || (filter === 'upcoming' && g.status === 'live'));
  }, [filter]);

  return (
    <Screen>
      <FadeIn>
        <Text style={styles.kicker}>2026 SEASON</Text>
        <Text style={[styles.title, { fontSize: screenTitle }]}>Schedule</Text>
        <Text style={styles.sub}>Tap any game for the box score</Text>
      </FadeIn>

      <View style={styles.segRow}>
        {(
          [
            ['all', 'All'],
            ['final', 'Results'],
            ['upcoming', 'Upcoming'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.seg, filter === key && styles.segOn]}
          >
            <Text style={[styles.segText, filter === key && styles.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {games.map((game, i) => {
        const result = resultLabel(game.bravesScore, game.oppScore);
        const href = { pathname: '/game/[pk]', params: { pk: String(game.gamePk || game.id) } } as const;
        return (
          <FadeIn key={`${game.id}-${i}`} delay={Math.min(i, 20) * 20}>
            <Link href={href} asChild>
              <Pressable style={styles.row}>
                <View style={styles.left}>
                  <Text style={styles.date}>{game.date.slice(5)}</Text>
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
                    <Text style={styles.chev}>›</Text>
                  )}
                </View>
              </Pressable>
            </Link>
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
    marginBottom: spacing.md,
  },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
  },
  segOn: { backgroundColor: colors.scarlet, borderColor: colors.scarlet },
  segText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 12 },
  segTextOn: { color: colors.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 10,
  },
  left: { width: 54 },
  date: { fontFamily: 'DMSans_700Bold', color: colors.white, fontSize: 13 },
  time: { fontFamily: 'DMSans_400Regular', color: colors.mistDim, fontSize: 11, marginTop: 2 },
  mid: { flex: 1 },
  matchup: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  matchupCompact: { fontSize: 20 },
  venue: { fontFamily: 'DMSans_400Regular', color: colors.mist, fontSize: 12, marginTop: 1 },
  right: { alignItems: 'flex-end', minWidth: 48 },
  result: { fontFamily: 'BebasNeue_400Regular', fontSize: 22 },
  win: { color: colors.success },
  loss: { color: colors.danger },
  score: { fontFamily: 'DMSans_500Medium', color: colors.mist, fontSize: 12, marginTop: -2 },
  chev: { fontFamily: 'BebasNeue_400Regular', color: colors.mistDim, fontSize: 28 },
});

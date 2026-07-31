import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { SectionHeader } from '@/components/SectionHeader';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import {
  dataAsOf,
  keyStats,
  leaders,
  nextGame,
  pitchingToday,
  schedule,
  standings,
  teamPulse,
  todayLineup,
} from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

export default function HomeScreen() {
  const { compact, pagePad } = usePhoneLayout();
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
  }));

  const upcoming = schedule.filter((g) => g.status === 'upcoming').slice(0, 3);
  const recent = schedule.filter((g) => g.status === 'final').slice(-2);
  const east = standings.slice(0, 3);

  return (
    <Screen>
      <FadeIn>
        <BrandMark size="lg" record={teamPulse.record} />
      </FadeIn>

      {/* Glanceable next game — edge-to-edge brand plane */}
      <FadeIn
        delay={60}
        style={[styles.heroBleed, { marginHorizontal: -pagePad }]}
      >
        <View style={[styles.hero, { paddingHorizontal: pagePad }]}>
          <View style={styles.heroTop}>
            <View style={styles.statusRow}>
              <Animated.View style={[styles.liveDot, pulseStyle]} />
              <Text style={styles.statusLabel}>NEXT</Text>
            </View>
            <Text style={styles.heroWhen}>
              {nextGame.date} · {nextGame.time}
            </Text>
          </View>

          <View style={styles.matchupRow}>
            <View style={styles.teamBlock}>
              <TeamLogo abbr="ATL" size={compact ? 56 : 64} />
              <Text style={styles.teamAbbr}>ATL</Text>
            </View>
            <Text style={styles.vs}>{nextGame.home ? 'VS' : '@'}</Text>
            <View style={styles.teamBlock}>
              <TeamLogo abbr={nextGame.opponentAbbr} size={compact ? 56 : 64} />
              <Text style={styles.teamAbbr}>{nextGame.opponentAbbr}</Text>
            </View>
          </View>

          <Text style={styles.heroMeta}>
            {nextGame.venue}
            {nextGame.starter ? ` · ${nextGame.starter}` : ''}
          </Text>

          <View style={styles.heroFooter}>
            <Text style={styles.heroRank}>{teamPulse.rank}</Text>
            <Text style={styles.heroStreak}>
              {teamPulse.streak} · L10 {teamPulse.lastTen}
            </Text>
          </View>
        </View>
      </FadeIn>

      {/* Key stats — no cards, scan strip */}
      <FadeIn delay={120}>
        <View style={styles.statStrip}>
          {keyStats.map((stat, i) => (
            <View
              key={stat.label}
              style={[styles.statCell, i < keyStats.length - 1 && styles.statCellBorder]}
            >
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      </FadeIn>

      <SectionHeader title="Tonight" href="/lineup" action="Lineup →" />
      <FadeIn delay={160} style={styles.tonightRow}>
        <View style={styles.spBlock}>
          <Text style={styles.spLabel}>SP</Text>
          <Text style={styles.spName}>{pitchingToday.starter.name}</Text>
          <Text style={styles.spMeta}>
            {pitchingToday.starter.era} ERA · {pitchingToday.starter.so} K
          </Text>
        </View>
        <View style={styles.batters}>
          {todayLineup.slice(0, 3).map((p, i) => (
            <Text key={p.name} style={styles.batterLine} numberOfLines={1}>
              <Text style={styles.batterNum}>{i + 1} </Text>
              {p.name.split(' ').slice(-1)[0]}
              <Text style={styles.batterPos}> {p.pos}</Text>
            </Text>
          ))}
        </View>
      </FadeIn>

      <SectionHeader title="NL East" href="/standings" action="Standings →" />
      <FadeIn delay={200}>
        {east.map((row, i) => (
          <View key={row.abbr} style={[styles.eastRow, row.highlight && styles.eastHot]}>
            <Text style={[styles.eastRank, row.highlight && styles.eastRankHot]}>{i + 1}</Text>
            <TeamLogo abbr={row.abbr} size={28} />
            <Text style={[styles.eastAbbr, row.highlight && styles.eastAbbrHot]}>{row.abbr}</Text>
            <Text style={styles.eastRecord}>
              {row.w}-{row.l}
            </Text>
            <Text style={styles.eastGb}>{row.gb === '—' ? '—' : `${row.gb} GB`}</Text>
          </View>
        ))}
      </FadeIn>

      <SectionHeader title="Games" href="/schedule" action="Schedule →" />
      <FadeIn delay={240}>
        {[...recent, ...upcoming].map((game) => {
          const final = game.status === 'final';
          const win =
            final && game.bravesScore != null && game.oppScore != null
              ? game.bravesScore > game.oppScore
              : null;
          return (
            <View key={game.id} style={styles.gameRow}>
              <Text style={styles.gameDate}>{game.date}</Text>
              <TeamLogo abbr={game.opponentAbbr} size={26} />
              <Text style={styles.gameMatch}>
                {game.home ? 'vs' : '@'} {game.opponentAbbr}
              </Text>
              {final ? (
                <Text style={[styles.gameResult, win ? styles.win : styles.loss]}>
                  {win ? 'W' : 'L'} {game.bravesScore}-{game.oppScore}
                </Text>
              ) : (
                <Text style={styles.gameTime}>{game.time}</Text>
              )}
            </View>
          );
        })}
      </FadeIn>

      <SectionHeader title="Leaders" />
      <FadeIn delay={280}>
        {leaders.map((leader) => (
          <View key={leader.name} style={styles.leaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.leaderName}>{leader.name}</Text>
              <Text style={styles.leaderStat}>{leader.stat}</Text>
            </View>
            <Text style={styles.leaderRole}>{leader.role}</Text>
          </View>
        ))}
      </FadeIn>

      <View style={styles.quickLinks}>
        {(
          [
            ['Lineup', '/lineup'],
            ['Standings', '/standings'],
            ['Schedule', '/schedule'],
          ] as const
        ).map(([label, href]) => (
          <Link key={href} href={href} asChild>
            <Pressable style={styles.quickBtn}>
              <Text style={styles.quickText}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Text style={styles.asOf}>Updated {dataAsOf}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBleed: {
    marginTop: spacing.lg,
  },
  hero: {
    backgroundColor: colors.scarlet,
    paddingTop: 18,
    paddingBottom: 20,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: colors.gold,
  },
  statusLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 11,
    letterSpacing: 2,
  },
  heroWhen: {
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 8,
  },
  teamBlock: {
    alignItems: 'center',
    gap: 6,
    minWidth: 72,
  },
  teamAbbr: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 22,
    letterSpacing: 1,
  },
  vs: {
    fontFamily: 'BebasNeue_400Regular',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 28,
  },
  heroMeta: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 14,
  },
  heroFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroRank: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 14,
  },
  heroStreak: {
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  statStrip: {
    flexDirection: 'row',
    marginTop: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  statCell: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  statValue: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
    marginTop: 4,
  },
  tonightRow: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  spBlock: {
    flex: 1.1,
    paddingRight: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.line,
  },
  spLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  spName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 17,
    marginTop: 4,
  },
  spMeta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 3,
  },
  batters: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  batterLine: {
    fontFamily: 'DMSans_500Medium',
    color: colors.white,
    fontSize: 14,
  },
  batterNum: {
    color: colors.mistDim,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
  },
  batterPos: {
    color: colors.gold,
    fontFamily: 'DMSans_500Medium',
  },
  eastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  eastHot: {
    backgroundColor: 'rgba(206, 17, 65, 0.12)',
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomColor: 'transparent',
  },
  eastRank: {
    width: 16,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.mistDim,
    fontSize: 18,
  },
  eastRankHot: {
    color: colors.gold,
  },
  eastAbbr: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  eastAbbrHot: {
    color: colors.cream,
  },
  eastRecord: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 14,
    width: 56,
    textAlign: 'right',
  },
  eastGb: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    width: 58,
    textAlign: 'right',
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  gameDate: {
    width: 48,
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
  },
  gameMatch: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  gameResult: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
  },
  win: { color: colors.success },
  loss: { color: colors.danger },
  gameTime: {
    fontFamily: 'DMSans_500Medium',
    color: colors.gold,
    fontSize: 13,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  leaderName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  leaderStat: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 2,
  },
  leaderRole: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.gold,
    fontSize: 18,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 28,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  quickText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 13,
  },
  asOf: {
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
  },
});

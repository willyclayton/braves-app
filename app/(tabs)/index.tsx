import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
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
  trendFor,
} from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';
import { gameDayLabel } from '@/lib/dates';
import { formFromWindow, formGlyph } from '@/lib/form';
import {
  countdownParts,
  resolveHero,
  resultLabel,
} from '@/lib/gameWindow';

function shortName(full: string) {
  const parts = full.replace(/\./g, '').split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (/^(jr|sr|ii|iii|iv)$/i.test(last) && parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return last;
}

export default function HomeScreen() {
  const { compact, pagePad } = usePhoneLayout();
  const [now, setNow] = useState(() => new Date());
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
  }));

  const hero = useMemo(() => resolveHero(schedule, now), [now]);
  const east = standings.slice(0, 3);
  const upcoming = schedule.filter((g) => g.status === 'upcoming').slice(0, 3);
  const nextLabel = nextGame ? gameDayLabel(nextGame.date, now) : 'Next';
  const gameHref = (pk?: number | string) => ({
    pathname: '/game/[pk]' as const,
    params: { pk: String(pk) },
  });

  return (
    <Screen>
      <FadeIn>
        <BrandMark size="lg" record={teamPulse.record} />
      </FadeIn>

      <FadeIn delay={60} style={[styles.heroBleed, { marginHorizontal: -pagePad }]}>
        {hero.mode === 'result' && hero.result ? (
          <Link href={gameHref(hero.result.gamePk || hero.result.id)} asChild>
            <Pressable style={[styles.hero, styles.heroResult, { paddingHorizontal: pagePad }]}>
              <View style={styles.heroTop}>
                <View style={styles.statusRow}>
                  <View style={[styles.liveDot, { backgroundColor: colors.white }]} />
                  <Text style={styles.statusLabel}>FINAL</Text>
                </View>
                <Text style={styles.heroWhen}>Box score ›</Text>
              </View>

              {(() => {
                const r = resultLabel(hero.result)!;
                return (
                  <>
                    <Text style={[styles.resultWord, r.win ? styles.winText : styles.lossText]}>
                      {r.text}
                    </Text>
                    <Text style={styles.resultScore}>{r.score}</Text>
                  </>
                );
              })()}

              <View style={styles.matchupRow}>
                <View style={styles.teamBlock}>
                  <TeamLogo abbr="ATL" size={compact ? 48 : 56} />
                  <Text style={styles.teamAbbr}>ATL</Text>
                </View>
                <Text style={styles.vs}>{hero.result.home ? 'VS' : '@'}</Text>
                <View style={styles.teamBlock}>
                  <TeamLogo abbr={hero.result.opponentAbbr} size={compact ? 48 : 56} />
                  <Text style={styles.teamAbbr}>{hero.result.opponentAbbr}</Text>
                </View>
              </View>

              <Text style={styles.heroMeta}>{hero.result.venue}</Text>
              <View style={styles.heroFooter}>
                <Text style={styles.heroRank}>{teamPulse.rank}</Text>
                <Text style={styles.heroStreak}>
                  {teamPulse.streak} · L10 {teamPulse.lastTen}
                </Text>
              </View>
            </Pressable>
          </Link>
        ) : hero.next ? (
          <Link href={gameHref(hero.next.gamePk || hero.next.id)} asChild>
            <Pressable style={[styles.hero, { paddingHorizontal: pagePad }]}>
              <View style={styles.heroTop}>
                <View style={styles.statusRow}>
                  <Animated.View style={[styles.liveDot, pulseStyle]} />
                  <Text style={styles.statusLabel}>
                    {gameDayLabel(hero.next.date, now).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.heroWhen}>
                  {hero.next.date} · {hero.next.time}
                </Text>
              </View>

              <View style={styles.matchupRow}>
                <View style={styles.teamBlock}>
                  <TeamLogo abbr="ATL" size={compact ? 56 : 64} />
                  <Text style={styles.teamAbbr}>ATL</Text>
                </View>
                <Text style={styles.vs}>{hero.next.home ? 'VS' : '@'}</Text>
                <View style={styles.teamBlock}>
                  <TeamLogo abbr={hero.next.opponentAbbr} size={compact ? 56 : 64} />
                  <Text style={styles.teamAbbr}>{hero.next.opponentAbbr}</Text>
                </View>
              </View>

              <Text style={styles.heroMeta}>
                {hero.next.venue}
                {hero.next.starter ? ` · ${hero.next.starter}` : ''}
              </Text>
              {hero.next.gameDate ? (
                <Text style={styles.countdown}>
                  First pitch in {countdownParts(hero.next.gameDate, now)}
                </Text>
              ) : null}
              <View style={styles.heroFooter}>
                <Text style={styles.heroRank}>{teamPulse.rank}</Text>
                <Text style={styles.heroStreak}>Tap for game page ›</Text>
              </View>
            </Pressable>
          </Link>
        ) : null}
      </FadeIn>

      {hero.mode === 'result' && hero.next ? (
        <FadeIn delay={100}>
          <Link href={gameHref(hero.next.gamePk || hero.next.id)} asChild>
            <Pressable style={styles.nextStrip}>
              <Text style={styles.nextStripLabel}>
                {gameDayLabel(hero.next.date, now).toUpperCase()}
              </Text>
              <TeamLogo abbr={hero.next.opponentAbbr} size={24} />
              <Text style={styles.nextStripMatch}>
                {hero.next.home ? 'vs' : '@'} {hero.next.opponentAbbr}
              </Text>
              <Text style={styles.nextStripWhen}>
                {hero.next.time}
                {hero.next.gameDate ? ` · ${countdownParts(hero.next.gameDate, now)}` : ''}
                {' ›'}
              </Text>
            </Pressable>
          </Link>
        </FadeIn>
      ) : null}

      <SectionHeader title={nextLabel} href="/lineup" action="Lineup →" />
      <FadeIn delay={140}>
        <Link
          href={
            nextGame
              ? gameHref(nextGame.gamePk || nextGame.id)
              : '/lineup'
          }
          asChild
        >
          <Pressable style={styles.tonightRow}>
            <View style={styles.spBlock}>
              <Text style={styles.spLabel}>
                {nextGame ? `${gameDayLabel(nextGame.date, now).toUpperCase()} SP` : 'SP'}
              </Text>
              <Text style={styles.spName}>{pitchingToday.starter?.name || 'TBD'}</Text>
              {pitchingToday.starter ? (
                <Text style={styles.spMeta}>
                  {pitchingToday.starter.era} ERA · {pitchingToday.starter.so} K
                </Text>
              ) : null}
              {nextGame ? (
                <Text style={styles.spWhen}>
                  {nextGame.date} · {nextGame.time}
                </Text>
              ) : null}
            </View>
            <View style={styles.batters}>
              {todayLineup.slice(0, 3).map((p, i) => {
                const trend = trendFor(p.id, p.name);
                const form = formFromWindow(trend?.windows.l15);
                const glyph = formGlyph(form);
                return (
                  <Text key={p.name} style={styles.batterLine} numberOfLines={1}>
                    <Text style={styles.batterNum}>{i + 1} </Text>
                    {shortName(p.name)}
                    <Text style={styles.batterPos}> {p.pos}</Text>
                    {glyph ? ` ${glyph}` : ''}
                  </Text>
                );
              })}
            </View>
          </Pressable>
        </Link>
      </FadeIn>

      <SectionHeader title="NL East" href="/standings" action="Standings →" />
      <FadeIn delay={180}>
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

      <SectionHeader title="Upcoming" href="/schedule" action="Schedule →" />
      <FadeIn delay={220}>
        {upcoming.map((game) => (
          <Link
            key={game.id}
            href={{ pathname: '/game/[pk]', params: { pk: String(game.gamePk || game.id) } }}
            asChild
          >
            <Pressable style={styles.gameRow}>
              <Text style={styles.gameDate}>{game.date}</Text>
              <TeamLogo abbr={game.opponentAbbr} size={26} />
              <Text style={styles.gameMatch}>
                {game.home ? 'vs' : '@'} {game.opponentAbbr}
              </Text>
              <Text style={styles.gameTime}>{game.time}</Text>
            </Pressable>
          </Link>
        ))}
      </FadeIn>

      <SectionHeader title="Leaders" />
      <FadeIn delay={240}>
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

      {/* Team KPIs with league context — bottom of hub */}
      <SectionHeader title="Team marks" />
      <FadeIn delay={260}>
        {keyStats.map((stat) => (
          <View key={stat.label} style={styles.kpiRow}>
            <Text style={styles.kpiLabel}>{stat.label}</Text>
            <Text style={styles.kpiValue}>{stat.value}</Text>
            <View style={styles.kpiMeta}>
              <Text style={styles.kpiRank}>{stat.detail}</Text>
              {stat.leaderAbbr ? (
                <Text style={styles.kpiLeader}>
                  Best {stat.leaderAbbr} {stat.leaderValue}
                </Text>
              ) : null}
            </View>
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
  heroBleed: { marginTop: spacing.lg },
  hero: {
    backgroundColor: colors.scarlet,
    paddingTop: 18,
    paddingBottom: 20,
  },
  heroResult: {
    backgroundColor: colors.navyLift,
    borderBottomWidth: 3,
    borderBottomColor: colors.scarlet,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  resultWord: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 42,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 10,
  },
  winText: { color: colors.success },
  lossText: { color: colors.danger },
  resultScore: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 56,
    textAlign: 'center',
    lineHeight: 58,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  teamBlock: { alignItems: 'center', gap: 6, minWidth: 72 },
  teamAbbr: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 20,
    letterSpacing: 1,
  },
  vs: {
    fontFamily: 'BebasNeue_400Regular',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 26,
  },
  heroMeta: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  countdown: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  heroFooter: {
    marginTop: 14,
    paddingTop: 12,
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
  nextStrip: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  nextStripLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  nextStripMatch: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 14,
  },
  nextStripWhen: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
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
  spWhen: {
    fontFamily: 'DMSans_500Medium',
    color: colors.gold,
    fontSize: 11,
    marginTop: 6,
  },
  batters: { flex: 1, justifyContent: 'center', gap: 4 },
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
  eastRankHot: { color: colors.gold },
  eastAbbr: {
    flex: 1,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  eastAbbrHot: { color: colors.cream },
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
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  kpiLabel: {
    width: 36,
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 12,
    letterSpacing: 1,
  },
  kpiValue: {
    width: 64,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
  },
  kpiMeta: { flex: 1 },
  kpiRank: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 13,
  },
  kpiLeader: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
    marginTop: 2,
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

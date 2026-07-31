import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { StatChip } from '@/components/StatChip';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { dataAsOf, keyStats, leaders, nextGame, teamPulse } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

export default function HomeScreen() {
  const { heroTitle, matchup, compact } = usePhoneLayout();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.92 + pulse.value * 0.08 }],
  }));

  return (
    <Screen contentStyle={styles.content}>
      <FadeIn>
        <BrandMark size="lg" />
      </FadeIn>

      <FadeIn delay={80} style={styles.heroCopy}>
        <Text style={[styles.headline, { fontSize: heroTitle }]}>Chop on.</Text>
        <Text style={[styles.support, compact && styles.supportCompact]}>
          Key stats, tonight's lineup, NL East race, and the stretch run — nothing extra.
        </Text>
        <Text style={styles.asOf}>Updated {dataAsOf} · MLB Stats API</Text>
      </FadeIn>

      <FadeIn delay={160}>
        <LinearGradient
          colors={['#CE1141', '#9B0D31', '#132448']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.nextGame, compact && styles.nextGameCompact]}
        >
          <View style={styles.nextTop}>
            <View style={styles.liveRow}>
              <Animated.View style={[styles.dot, pulseStyle]} />
              <Text style={styles.nextEyebrow}>NEXT UP</Text>
            </View>
            <Text style={styles.nextMeta}>
              {nextGame.date} · {nextGame.time}
            </Text>
          </View>
          <Text style={[styles.matchup, { fontSize: matchup }]}>
            {nextGame.home ? 'vs' : '@'} {nextGame.opponentAbbr}
          </Text>
          <Text style={styles.venue}>
            {nextGame.venue}
            {nextGame.starter ? ` · ${nextGame.starter}` : ''}
          </Text>
          <View style={styles.recordRow}>
            <Text style={styles.record}>{teamPulse.record}</Text>
            <Text style={styles.rank}>{teamPulse.rank}</Text>
          </View>
        </LinearGradient>
      </FadeIn>

      <FadeIn delay={240} style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Team pulse</Text>
        <Text style={styles.sectionHint}>Season snapshot</Text>
      </FadeIn>

      <View style={styles.statGrid}>
        {keyStats.map((stat, i) => (
          <StatChip
            key={stat.label}
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
            delay={280 + i * 60}
          />
        ))}
      </View>

      <View style={styles.pulseRow}>
        {[
          ['STREAK', teamPulse.streak],
          ['L10', teamPulse.lastTen],
          ['+/-', teamPulse.runDiff],
        ].map(([label, value], i) => (
          <FadeIn key={label} delay={420 + i * 50} style={styles.pulseItem}>
            <Text style={styles.pulseLabel}>{label}</Text>
            <Text style={styles.pulseValue}>{value}</Text>
          </FadeIn>
        ))}
      </View>

      <FadeIn delay={520} style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Leaders</Text>
        <Link href="/lineup" asChild>
          <Pressable>
            <Text style={styles.link}>Lineup →</Text>
          </Pressable>
        </Link>
      </FadeIn>

      <View style={styles.leaders}>
        {leaders.map((leader, i) => (
          <FadeIn key={leader.name} delay={560 + i * 70} style={styles.leaderRow}>
            <View>
              <Text style={styles.leaderName}>{leader.name}</Text>
              <Text style={styles.leaderStat}>{leader.stat}</Text>
            </View>
            <Text style={styles.leaderRole}>{leader.role}</Text>
          </FadeIn>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.md,
  },
  heroCopy: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    maxWidth: 340,
  },
  headline: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.cream,
    fontSize: 48,
    letterSpacing: 1,
  },
  support: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
  },
  supportCompact: {
    fontSize: 14,
    lineHeight: 21,
  },
  asOf: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 10,
  },
  nextGame: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  nextGameCompact: {
    padding: spacing.md,
  },
  nextTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: colors.gold,
  },
  nextEyebrow: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 12,
    letterSpacing: 2,
  },
  nextMeta: {
    fontFamily: 'DMSans_500Medium',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  matchup: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 54,
    marginTop: spacing.md,
    letterSpacing: 1,
  },
  venue: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    marginTop: 2,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  record: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 32,
  },
  rank: {
    fontFamily: 'DMSans_500Medium',
    color: colors.gold,
    fontSize: 14,
  },
  sectionHead: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 28,
    letterSpacing: 1,
  },
  sectionHint: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 13,
  },
  link: {
    fontFamily: 'DMSans_500Medium',
    color: colors.scarletSoft,
    fontSize: 14,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pulseRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.md,
  },
  pulseItem: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.scarlet,
  },
  pulseLabel: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  pulseValue: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
    marginTop: 4,
  },
  leaders: {
    gap: 2,
  },
  leaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  leaderName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 16,
  },
  leaderStat: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginTop: 2,
  },
  leaderRole: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.gold,
    fontSize: 20,
  },
});

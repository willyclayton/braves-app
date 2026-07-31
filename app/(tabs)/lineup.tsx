import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { nextGame, pitchingToday, todayLineup, trendFor } from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type WindowKey = 'l10' | 'l15' | 'l30';

export default function LineupScreen() {
  const { screenTitle } = usePhoneLayout();
  const [window, setWindow] = useState<WindowKey>('l15');

  return (
    <Screen>
      <FadeIn>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>TODAY</Text>
            <Text style={[styles.title, { fontSize: screenTitle }]}>Lineup</Text>
          </View>
          {nextGame ? <TeamLogo abbr={nextGame.opponentAbbr} size={44} /> : null}
        </View>
        <Text style={styles.sub}>
          {nextGame
            ? `${nextGame.home ? 'vs' : '@'} ${nextGame.opponent} · ${nextGame.date}`
            : 'Projected order'}
        </Text>
      </FadeIn>

      <FadeIn delay={80} style={styles.spRow}>
        <View style={styles.numBubble}>
          <Text style={styles.num}>{pitchingToday.starter?.number || 'SP'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.spLabel}>STARTING PITCHER</Text>
          <Text style={styles.spName}>{pitchingToday.starter?.name || 'TBD'}</Text>
          {pitchingToday.starter ? (
            <Text style={styles.spMeta}>
              {pitchingToday.starter.era} ERA · {pitchingToday.starter.whip} WHIP ·{' '}
              {pitchingToday.starter.so} K
            </Text>
          ) : null}
        </View>
      </FadeIn>

      <Text style={styles.section}>Batting order</Text>
      <View style={styles.segRow}>
        {(
          [
            ['l10', 'L10'],
            ['l15', 'L15'],
            ['l30', 'L30'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setWindow(key)}
            style={[styles.seg, window === key && styles.segOn]}
          >
            <Text style={[styles.segText, window === key && styles.segTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {todayLineup.map((player, i) => {
        const trend = trendFor(player.id, player.name);
        const w = trend?.windows[window];
        const form = trend?.form;
        return (
          <FadeIn key={player.name} delay={120 + i * 35} style={styles.row}>
            <Text style={styles.order}>{i + 1}</Text>
            <View style={styles.numBubbleSm}>
              <Text style={styles.numSm}>{player.number || '—'}</Text>
            </View>
            <View style={styles.playerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.playerName}>{player.name}</Text>
                {form === 'hot' ? <Text style={styles.form}>🔥</Text> : null}
                {form === 'cold' ? <Text style={styles.form}>❄️</Text> : null}
              </View>
              <Text style={styles.playerMeta}>
                Season {player.avg} · {player.ops} OPS
              </Text>
              {w ? (
                <Text style={styles.trendMeta}>
                  {window.toUpperCase()} {w.avg} AVG · {w.ops} OPS · {w.hr} HR ({w.g} G)
                </Text>
              ) : (
                <Text style={styles.trendMeta}>No recent sample</Text>
              )}
            </View>
            <Text style={styles.pos}>{player.pos}</Text>
          </FadeIn>
        );
      })}

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
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
    fontSize: 22,
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
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  seg: {
    flex: 1,
    paddingVertical: 8,
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
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: 10,
  },
  order: {
    width: 18,
    fontFamily: 'BebasNeue_400Regular',
    color: colors.mistDim,
    fontSize: 18,
    marginTop: 6,
  },
  numBubbleSm: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.navyLift,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  numSm: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.cream,
    fontSize: 16,
  },
  playerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  form: { fontSize: 14 },
  playerMeta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
    marginTop: 2,
  },
  trendMeta: {
    fontFamily: 'DMSans_500Medium',
    color: colors.gold,
    fontSize: 12,
    marginTop: 3,
  },
  pos: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.gold,
    fontSize: 18,
    minWidth: 28,
    textAlign: 'right',
    marginTop: 6,
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

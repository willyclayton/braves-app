import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameStamp } from '@/components/GameStamp';
import { LeagueRankings } from '@/components/LeagueRankings';
import { PlayerHeadshot } from '@/components/PlayerHeadshot';
import { TeamLogo } from '@/components/TeamLogo';
import { TrendChart } from '@/components/TrendChart';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import {
  hitters,
  hitterById,
  pitchers,
  pitcherById,
  WINDOW_KEYS,
  WINDOW_LABELS,
  type WindowKey,
} from '@/data/braves';
import {
  batterGameStamp,
  formFromHitWindow,
  formFromPitchWindow,
  formGlyph,
  formLabel,
  parseInnings,
  pitcherGameStamp,
} from '@/lib/form';
import { opponentAbbr } from '@/lib/teams';

type HitMetric = 'h' | 'rbi' | 'hr' | 'r' | 'so';
type PitchMetric = 'so' | 'er' | 'h' | 'bb' | 'ip';

const HIT_METRICS: { key: HitMetric; label: string }[] = [
  { key: 'h', label: 'Hits' },
  { key: 'rbi', label: 'RBI' },
  { key: 'hr', label: 'HR' },
  { key: 'r', label: 'Runs' },
  { key: 'so', label: 'SO' },
];

const PITCH_METRICS: { key: PitchMetric; label: string }[] = [
  { key: 'so', label: 'K' },
  { key: 'er', label: 'ER' },
  { key: 'h', label: 'H' },
  { key: 'bb', label: 'BB' },
  { key: 'ip', label: 'IP' },
];

const WINDOW_GAMES: Record<WindowKey, number> = {
  l5: 5,
  l10: 10,
  l20: 20,
  l30: 30,
};

function parseWindowParam(raw?: string | string[]): WindowKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && (WINDOW_KEYS as string[]).includes(v)) return v as WindowKey;
  return 'l10';
}

export function generateStaticParams() {
  return [...hitters, ...pitchers].map((p) => ({ id: String(p.id) }));
}

function WindowSeg({
  value,
  onChange,
}: {
  value: WindowKey;
  onChange: (v: WindowKey) => void;
}) {
  return (
    <View style={styles.segRow}>
      {WINDOW_KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => onChange(k)}
          style={[styles.seg, value === k && styles.segOn]}
        >
          <Text style={[styles.segText, value === k && styles.segTextOn]}>
            {WINDOW_LABELS[k]}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function StatStrip({
  items,
}: {
  items: { label: string; value: string; accent?: boolean }[];
}) {
  return (
    <View style={styles.statStrip}>
      {items.map((item) => (
        <View key={item.label} style={styles.statItem}>
          <Text style={styles.statLabel}>{item.label}</Text>
          <Text style={[styles.statVal, item.accent && styles.statValAccent]}>
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function PlayerScreen() {
  const { id, window: windowParam } = useLocalSearchParams<{
    id: string;
    window?: string;
  }>();
  const hitter = hitterById(id);
  const pitcher = !hitter ? pitcherById(id) : undefined;
  const [window, setWindow] = useState<WindowKey>(() => parseWindowParam(windowParam));
  const [hitMetric, setHitMetric] = useState<HitMetric>('h');
  const [pitchMetric, setPitchMetric] = useState<PitchMetric>('so');
  const games = WINDOW_GAMES[window];

  useEffect(() => {
    setWindow(parseWindowParam(windowParam));
  }, [windowParam]);

  const hitLog = useMemo(
    () => (hitter ? hitter.log.slice(-games) : []),
    [hitter, games]
  );
  const pitchLog = useMemo(
    () => (pitcher ? pitcher.log.slice(-games) : []),
    [pitcher, games]
  );

  const hitValues = useMemo(
    () => hitLog.map((g) => Number(g[hitMetric]) || 0),
    [hitLog, hitMetric]
  );
  const hitLabels = useMemo(
    () =>
      hitLog.map((g) => {
        const d = g.date?.slice(5) || '';
        const abbr = opponentAbbr(g.opp);
        return d ? `${d} ${abbr}` : abbr || 'Game';
      }),
    [hitLog]
  );
  const pitchValues = useMemo(
    () =>
      pitchLog.map((g) => {
        if (pitchMetric === 'ip') return parseInnings(g.ip);
        return Number(g[pitchMetric]) || 0;
      }),
    [pitchLog, pitchMetric]
  );
  const pitchLabels = useMemo(
    () =>
      pitchLog.map((g) => {
        const d = g.date?.slice(5) || '';
        const abbr = opponentAbbr(g.opp);
        return d ? `${d} ${abbr}` : abbr || 'Game';
      }),
    [pitchLog]
  );

  if (!hitter && !pitcher) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Player',
            headerStyle: { backgroundColor: colors.navy },
            headerTintColor: colors.white,
          }}
        />
        <Screen>
          <Text style={styles.missing}>Player not found</Text>
        </Screen>
      </>
    );
  }

  if (hitter) {
    const w = hitter.windows[window] || hitter.windows.l5 || hitter.windows.l10 || hitter.season;
    const form = formFromHitWindow(
      hitter.windows[window] || hitter.windows.l10 || hitter.windows.l5
    );
    const sum = hitValues.reduce((a, b) => a + b, 0);
    const metricLabel = HIT_METRICS.find((m) => m.key === hitMetric)?.label || '';

    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: hitter.name,
            headerStyle: { backgroundColor: colors.navy },
            headerTintColor: colors.white,
            headerTitleStyle: { fontFamily: 'DMSans_700Bold', fontSize: 16 },
          }}
        />
        <Screen>
          <FadeIn>
            <View style={styles.head}>
              <PlayerHeadshot id={hitter.id} name={hitter.name} pos={hitter.pos} size={72} />
              <View style={styles.headText}>
                <Text style={styles.pos}>{hitter.pos}</Text>
                <Text style={styles.name}>{hitter.name}</Text>
                <View style={styles.formRow}>
                  <Text style={styles.glyph}>{formGlyph(form)}</Text>
                  <Text
                    style={[
                      styles.formTag,
                      form === 'hot' && styles.formHot,
                      form === 'cold' && styles.formCold,
                    ]}
                  >
                    {formLabel(form)}
                  </Text>
                </View>
                {hitter.log.length && hitter.log[hitter.log.length - 1].gamePk ? (
                  <Link
                    href={{
                      pathname: '/game/[pk]',
                      params: { pk: String(hitter.log[hitter.log.length - 1].gamePk) },
                    }}
                    asChild
                  >
                    <Pressable style={styles.lastGame}>
                      <Text style={styles.lastGameText}>Last game ›</Text>
                    </Pressable>
                  </Link>
                ) : null}
              </View>
            </View>
          </FadeIn>

          <Text style={styles.controlLabel}>Sample window</Text>
          <WindowSeg value={window} onChange={setWindow} />

          <StatStrip
            items={[
              { label: 'H-AB', value: `${w.h}-${w.ab}`, accent: true },
              { label: 'AVG', value: w.avg },
              { label: 'OPS', value: w.ops, accent: true },
              { label: 'HR', value: String(w.hr) },
              { label: 'RBI', value: String(w.rbi ?? 0) },
              { label: 'G', value: String(w.g) },
            ]}
          />

          <LeagueRankings rankings={hitter.rankings} playerName={hitter.name} />

          <Text style={styles.chartTitle}>
            {WINDOW_LABELS[window]} · {metricLabel}
          </Text>
          <View style={styles.segRow}>
            {HIT_METRICS.map((m) => (
              <Pressable
                key={m.key}
                onPress={() => setHitMetric(m.key)}
                style={[styles.segSm, hitMetric === m.key && styles.segOn]}
              >
                <Text style={[styles.segText, hitMetric === m.key && styles.segTextOn]}>
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TrendChart
            values={hitValues}
            labels={hitLabels}
            color={form === 'hot' ? '#FF8A4C' : form === 'cold' ? '#7EC8FF' : colors.gold}
          />
          <Text style={styles.chartSum}>
            {sum} {metricLabel.toLowerCase()} across {hitLog.length} games
          </Text>

          <Text style={styles.chartTitle}>Recent games · {WINDOW_LABELS[window]}</Text>
          <View style={styles.logHead}>
            <Text style={styles.logHeadDate}>DATE</Text>
            <Text style={styles.logHeadOpp}>OPP</Text>
            <Text style={styles.logHeadBadge} />
            <Text style={styles.logHeadStat}>H-AB</Text>
            <Text style={styles.logHeadStat}>RBI</Text>
            <Text style={styles.logHeadStat}>HR</Text>
          </View>
          {[...hitLog].reverse().map((g, i) => {
            const abbr = opponentAbbr(g.opp);
            const stamp = batterGameStamp(g);
            const row = (
              <View style={styles.logRow}>
                <Text style={styles.logDate}>{g.date.slice(5)}</Text>
                <View style={styles.logOppCell}>
                  <TeamLogo abbr={abbr} size={20} />
                  <Text style={styles.logOpp}>{abbr}</Text>
                </View>
                <View style={styles.logBadge}>
                  {stamp ? <GameStamp kind={stamp} /> : null}
                </View>
                <Text style={styles.logStat}>
                  {g.h}-{g.ab}
                </Text>
                <Text style={styles.logStat}>{g.rbi}</Text>
                <Text style={styles.logStat}>{g.hr}</Text>
              </View>
            );
            return g.gamePk ? (
              <Link
                key={`${g.date}-${i}`}
                href={{ pathname: '/game/[pk]', params: { pk: String(g.gamePk) } }}
                asChild
              >
                <Pressable>{row}</Pressable>
              </Link>
            ) : (
              <View key={`${g.date}-${i}`}>{row}</View>
            );
          })}
        </Screen>
      </>
    );
  }

  const p = pitcher!;
  const w = p.windows[window] || p.windows.l5 || p.windows.l10 || p.season;
  const form = formFromPitchWindow(p.windows[window] || p.windows.l10 || p.windows.l5);
  const sum = pitchValues.reduce((a, b) => a + b, 0);
  const metricLabel = PITCH_METRICS.find((m) => m.key === pitchMetric)?.label || '';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: p.name,
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontFamily: 'DMSans_700Bold', fontSize: 16 },
        }}
      />
      <Screen>
        <FadeIn>
          <View style={styles.head}>
            <PlayerHeadshot id={p.id} name={p.name} pos={p.pos} size={72} />
            <View style={styles.headText}>
              <Text style={styles.pos}>{p.pos}</Text>
              <Text style={styles.name}>{p.name}</Text>
              <View style={styles.formRow}>
                <Text style={styles.glyph}>{formGlyph(form)}</Text>
                <Text
                  style={[
                    styles.formTag,
                    form === 'hot' && styles.formHot,
                    form === 'cold' && styles.formCold,
                  ]}
                >
                  {formLabel(form)}
                </Text>
              </View>
              {p.log.length && p.log[p.log.length - 1].gamePk ? (
                <Link
                  href={{
                    pathname: '/game/[pk]',
                    params: { pk: String(p.log[p.log.length - 1].gamePk) },
                  }}
                  asChild
                >
                  <Pressable style={styles.lastGame}>
                    <Text style={styles.lastGameText}>Last game ›</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
        </FadeIn>

        <Text style={styles.controlLabel}>Sample window</Text>
        <WindowSeg value={window} onChange={setWindow} />

        <StatStrip
          items={[
            { label: 'IP', value: w.ip, accent: true },
            { label: 'ERA', value: w.era, accent: true },
            { label: 'WHIP', value: w.whip },
            { label: 'K', value: String(w.so) },
            { label: 'BB', value: String(w.bb ?? 0) },
            { label: 'G', value: String(w.g) },
          ]}
        />

        <LeagueRankings rankings={p.rankings} playerName={p.name} />

        <Text style={styles.chartTitle}>
          {WINDOW_LABELS[window]} · {metricLabel}
        </Text>
        <View style={styles.segRow}>
          {PITCH_METRICS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setPitchMetric(m.key)}
              style={[styles.segSm, pitchMetric === m.key && styles.segOn]}
            >
              <Text style={[styles.segText, pitchMetric === m.key && styles.segTextOn]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TrendChart
          values={pitchValues}
          labels={pitchLabels}
          color={form === 'hot' ? '#FF8A4C' : form === 'cold' ? '#7EC8FF' : colors.gold}
        />
        <Text style={styles.chartSum}>
          {pitchMetric === 'ip' ? sum.toFixed(1) : Math.round(sum * 10) / 10} {metricLabel} across{' '}
          {pitchLog.length} appearances
        </Text>

        <Text style={styles.chartTitle}>Recent appearances · {WINDOW_LABELS[window]}</Text>
        <View style={styles.logHead}>
          <Text style={styles.logHeadDate}>DATE</Text>
          <Text style={styles.logHeadOpp}>OPP</Text>
          <Text style={styles.logHeadBadge} />
          <Text style={styles.logHeadStat}>IP</Text>
          <Text style={styles.logHeadStat}>K</Text>
          <Text style={styles.logHeadStat}>ER</Text>
        </View>
        {[...pitchLog].reverse().map((g, i) => {
          const abbr = opponentAbbr(g.opp);
          const stamp = pitcherGameStamp(g);
          const row = (
            <View style={styles.logRow}>
              <Text style={styles.logDate}>{g.date.slice(5)}</Text>
              <View style={styles.logOppCell}>
                <TeamLogo abbr={abbr} size={20} />
                <Text style={styles.logOpp}>{abbr}</Text>
              </View>
              <View style={styles.logBadge}>
                {stamp ? <GameStamp kind={stamp} /> : null}
              </View>
              <Text style={styles.logStat}>{g.ip}</Text>
              <Text style={styles.logStat}>{g.so}</Text>
              <Text style={styles.logStat}>{g.er}</Text>
            </View>
          );
          return g.gamePk ? (
            <Link
              key={`${g.date}-${i}`}
              href={{ pathname: '/game/[pk]', params: { pk: String(g.gamePk) } }}
              asChild
            >
              <Pressable>{row}</Pressable>
            </Link>
          ) : (
            <View key={`${g.date}-${i}`}>{row}</View>
          );
        })}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  missing: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    textAlign: 'center',
    marginTop: 40,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: spacing.md,
  },
  headText: { flex: 1, minWidth: 0 },
  pos: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 2,
  },
  name: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 28,
    letterSpacing: 1,
    marginTop: 2,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 6,
  },
  glyph: { fontSize: 14 },
  formTag: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.mistDim,
  },
  formHot: { color: '#FF8A4C' },
  formCold: { color: '#7EC8FF' },
  lastGame: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  lastGameText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 13,
  },
  controlLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 11,
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  segRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  seg: {
    flex: 1,
    minWidth: 64,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
  },
  segSm: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
  },
  segOn: { backgroundColor: colors.scarlet, borderColor: colors.scarlet },
  segText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 13 },
  segTextOn: { color: colors.white },
  statStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: 'rgba(26, 47, 85, 0.55)',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  statItem: {
    width: '33.333%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  statLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  statVal: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.cream,
    fontSize: 28,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statValAccent: { color: colors.gold },
  chartTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 24,
    marginTop: 8,
    marginBottom: 8,
  },
  chartSum: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  logHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  logHeadDate: {
    width: 44,
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  logHeadOpp: {
    width: 72,
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  logHeadBadge: {
    width: 44,
  },
  logHeadStat: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  logDate: {
    width: 44,
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 13,
  },
  logOppCell: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logBadge: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  logOpp: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 13,
  },
  logStat: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.cream,
    fontSize: 14,
  },
});

import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  formFromHitWindow,
  formFromPitchWindow,
  formGlyph,
  formLabel,
} from '@/lib/form';

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

function parseIp(ip: string) {
  const [w, f] = String(ip).split('.');
  return Number(w || 0) + Number(f || 0) / 3;
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

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hitter = hitterById(id);
  const pitcher = !hitter ? pitcherById(id) : undefined;
  const [window, setWindow] = useState<WindowKey>('l10');
  const [hitMetric, setHitMetric] = useState<HitMetric>('h');
  const [pitchMetric, setPitchMetric] = useState<PitchMetric>('so');
  const games = WINDOW_GAMES[window];

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
        return g.opp ? `${d} ${g.opp}` : d || 'Game';
      }),
    [hitLog]
  );
  const pitchValues = useMemo(
    () =>
      pitchLog.map((g) => {
        if (pitchMetric === 'ip') return parseIp(g.ip);
        return Number(g[pitchMetric]) || 0;
      }),
    [pitchLog, pitchMetric]
  );
  const pitchLabels = useMemo(
    () =>
      pitchLog.map((g) => {
        const d = g.date?.slice(5) || '';
        return g.opp ? `${d} ${g.opp}` : d || 'Game';
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
    const w = hitter.windows[window] || hitter.windows.l10 || hitter.season;
    const form = formFromHitWindow(hitter.windows[window] || hitter.windows.l10);
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
                <Text style={styles.seasonLine}>
                  Season {hitter.season.avg} · {hitter.season.ops} OPS · {hitter.season.hr} HR
                </Text>
              </View>
            </View>
          </FadeIn>

          <Text style={styles.controlLabel}>Sample window</Text>
          <WindowSeg value={window} onChange={setWindow} />

          <View style={styles.statGrid}>
            {[
              ['AVG', w.avg],
              ['OPS', w.ops],
              ['HR', String(w.hr)],
              ['RBI', String(w.rbi ?? 0)],
              ['H', String(w.h)],
              ['G', String(w.g)],
            ].map(([label, val]) => (
              <View key={label} style={styles.statCell}>
                <Text style={styles.statLabel}>{label}</Text>
                <Text style={styles.statVal}>{val}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.chartTitle}>{WINDOW_LABELS[window]} · {metricLabel}</Text>
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

          <Text style={styles.chartTitle}>Recent games</Text>
          {[...hitLog].reverse().map((g, i) => (
            <View key={`${g.date}-${i}`} style={styles.logRow}>
              <Text style={styles.logDate}>{g.date.slice(5)}</Text>
              <Text style={styles.logOpp}>{g.opp || '—'}</Text>
              <Text style={styles.logStat}>
                {g.h}-{g.ab}
              </Text>
              <Text style={styles.logStat}>{g.rbi} RBI</Text>
              <Text style={styles.logStat}>{g.hr} HR</Text>
            </View>
          ))}
        </Screen>
      </>
    );
  }

  const p = pitcher!;
  const w = p.windows[window] || p.windows.l10 || p.season;
  const form = formFromPitchWindow(p.windows[window] || p.windows.l10);
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
              <Text style={styles.seasonLine}>
                Season {p.season.era} ERA · {p.season.whip} WHIP · {p.season.so} K
              </Text>
            </View>
          </View>
        </FadeIn>

        <Text style={styles.controlLabel}>Sample window</Text>
        <WindowSeg value={window} onChange={setWindow} />

        <View style={styles.statGrid}>
          {[
            ['ERA', w.era],
            ['WHIP', w.whip],
            ['K', String(w.so)],
            ['IP', w.ip],
            ['BB', String(w.bb ?? 0)],
            ['G', String(w.g)],
          ].map(([label, val]) => (
            <View key={label} style={styles.statCell}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statVal}>{val}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.chartTitle}>{WINDOW_LABELS[window]} · {metricLabel}</Text>
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

        <Text style={styles.chartTitle}>Recent appearances</Text>
        {[...pitchLog].reverse().map((g, i) => (
          <View key={`${g.date}-${i}`} style={styles.logRow}>
            <Text style={styles.logDate}>{g.date.slice(5)}</Text>
            <Text style={styles.logOpp}>{g.opp || '—'}</Text>
            <Text style={styles.logStat}>{g.ip} IP</Text>
            <Text style={styles.logStat}>{g.so} K</Text>
            <Text style={styles.logStat}>{g.er} ER</Text>
          </View>
        ))}
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
  head: { marginBottom: spacing.md },
  pos: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 2,
  },
  name: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 36,
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
  seasonLine: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
  },
  controlLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
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
  segText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 12 },
  segTextOn: { color: colors.white },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  statCell: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: colors.navyLift,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  statLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 10,
    letterSpacing: 1,
  },
  statVal: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
    marginTop: 2,
  },
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
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.md,
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
    fontSize: 12,
  },
  logOpp: {
    width: 40,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 13,
  },
  logStat: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
  },
});

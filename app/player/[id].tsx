import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GameStamp } from '@/components/GameStamp';
import { PlayerHeadshot } from '@/components/PlayerHeadshot';
import { PlayerOriginButton } from '@/components/PlayerOrigin';
import { SavantEmbed } from '@/components/SavantEmbed';
import { SavantTableHeader, SavantTabs, type SavantTab } from '@/components/SavantTabs';
import { StrikeZone } from '@/components/StrikeZone';
import { TeamLogo } from '@/components/TeamLogo';
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
  type Hitter,
  type Pitcher,
  type WindowKey,
} from '@/data/braves';
import {
  batterGameStamp,
  formFromHitWindow,
  formFromPitchWindow,
  formGlyph,
  formLabel,
  pitcherGameStamp,
} from '@/lib/form';
import { opponentAbbr } from '@/lib/teams';
import { resolveHitWindow, resolvePitchWindow, WINDOW_SIZE } from '@/lib/windows';

const WINDOW_GAMES = WINDOW_SIZE;

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

function StatTable({
  rows,
}: {
  rows: { label: string; values: string[] }[];
}) {
  return (
    <View style={styles.table}>
      {rows.map((row) => (
        <View key={row.label} style={styles.tableRow}>
          <Text style={styles.tableLabel}>{row.label}</Text>
          {row.values.map((v, i) => (
            <Text key={`${row.label}-${i}`} style={styles.tableVal}>
              {v}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function HitStandard({ player }: { player: Hitter }) {
  const s = player.season;
  return (
    <StatTable
      rows={[
        { label: 'G', values: [String(s.g)] },
        { label: 'AVG', values: [s.avg] },
        { label: 'OBP', values: [s.obp || '—'] },
        { label: 'SLG', values: [s.slg || '—'] },
        { label: 'OPS', values: [s.ops] },
        { label: 'HR', values: [String(s.hr)] },
        { label: 'RBI', values: [String(s.rbi ?? 0)] },
        { label: 'H', values: [String(s.h)] },
        { label: 'BB', values: [String(s.bb ?? 0)] },
        { label: 'SO', values: [String(s.so ?? 0)] },
        { label: 'SB', values: [String(s.sb ?? 0)] },
      ]}
    />
  );
}

function HitSplits({ player }: { player: Hitter }) {
  const cols = WINDOW_KEYS.map((k) => resolveHitWindow(player, k));
  return (
    <View>
      <View style={styles.tableRow}>
        <Text style={styles.tableLabel} />
        {WINDOW_KEYS.map((k) => (
          <Text key={k} style={styles.tableHead}>
            {WINDOW_LABELS[k]}
          </Text>
        ))}
      </View>
      <StatTable
        rows={[
          { label: 'AVG', values: cols.map((c) => c.avg) },
          { label: 'OPS', values: cols.map((c) => c.ops) },
          { label: 'HR', values: cols.map((c) => String(c.hr)) },
          { label: 'RBI', values: cols.map((c) => String(c.rbi ?? 0)) },
          { label: 'H', values: cols.map((c) => String(c.h)) },
        ]}
      />
    </View>
  );
}

function PitchStandard({ player }: { player: Pitcher }) {
  const s = player.season;
  return (
    <StatTable
      rows={[
        { label: 'G', values: [String(s.g)] },
        { label: 'IP', values: [s.ip] },
        { label: 'ERA', values: [s.era] },
        { label: 'WHIP', values: [s.whip] },
        { label: 'K', values: [String(s.so)] },
        { label: 'BB', values: [String(s.bb ?? 0)] },
        { label: 'H', values: [String(s.h ?? 0)] },
        { label: 'ER', values: [String(s.er ?? 0)] },
        { label: 'W', values: [String(s.w ?? 0)] },
        { label: 'SV', values: [String(s.sv ?? 0)] },
      ]}
    />
  );
}

function PitchSplits({ player }: { player: Pitcher }) {
  const cols = WINDOW_KEYS.map((k) => resolvePitchWindow(player, k));
  return (
    <View>
      <View style={styles.tableRow}>
        <Text style={styles.tableLabel} />
        {WINDOW_KEYS.map((k) => (
          <Text key={k} style={styles.tableHead}>
            {WINDOW_LABELS[k]}
          </Text>
        ))}
      </View>
      <StatTable
        rows={[
          { label: 'ERA', values: cols.map((c) => c.era) },
          { label: 'WHIP', values: cols.map((c) => c.whip) },
          { label: 'IP', values: cols.map((c) => c.ip) },
          { label: 'K', values: cols.map((c) => String(c.so)) },
          { label: 'BB', values: cols.map((c) => String(c.bb ?? 0)) },
        ]}
      />
    </View>
  );
}

function RoleDropdown({ label }: { label: string }) {
  return (
    <View style={styles.roleDrop}>
      <Text style={styles.roleDropText}>{label}</Text>
      <Text style={styles.roleDropCaret}>▾</Text>
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
  const [tab, setTab] = useState<SavantTab>('STATCAST');
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
    const w = resolveHitWindow(hitter, window);
    const form = formFromHitWindow(w);

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
              <PlayerOriginButton playerId={hitter.id} playerName={hitter.name} group="hitting" />
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

          <SavantEmbed playerId={hitter.id} group="hitting" />

          <SavantTabs value={tab} onChange={setTab} />
          <RoleDropdown label="BATTING" />
          <SavantTableHeader
            title={
              tab === 'STATCAST'
                ? 'Statcast Batting Statistics'
                : tab === 'STANDARD'
                  ? 'Standard Batting Statistics'
                  : tab === 'SPLITS'
                    ? 'Recent Splits'
                    : 'Game Logs'
            }
          />

          {tab === 'STATCAST' ? (
            <StrikeZone playerId={hitter.id} playerName={hitter.name} group="hitting" />
          ) : null}
          {tab === 'STANDARD' ? <HitStandard player={hitter} /> : null}
          {tab === 'SPLITS' ? <HitSplits player={hitter} /> : null}
          {tab === 'GAME LOGS' ? (
            <>
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
            </>
          ) : null}
        </Screen>
      </>
    );
  }

  const p = pitcher!;
  const w = resolvePitchWindow(p, window);
  const form = formFromPitchWindow(w);

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
            <PlayerOriginButton playerId={p.id} playerName={p.name} group="pitching" />
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

        <SavantEmbed playerId={p.id} group="pitching" />

        <SavantTabs value={tab} onChange={setTab} />
        <RoleDropdown label="PITCHING" />
        <SavantTableHeader
          title={
            tab === 'STATCAST'
              ? 'Statcast Pitching Statistics'
              : tab === 'STANDARD'
                ? 'Standard Pitching Statistics'
                : tab === 'SPLITS'
                  ? 'Recent Splits'
                  : 'Game Logs'
          }
        />

        {tab === 'STATCAST' ? (
          <StrikeZone playerId={p.id} playerName={p.name} group="pitching" />
        ) : null}
        {tab === 'STANDARD' ? <PitchStandard player={p} /> : null}
        {tab === 'SPLITS' ? <PitchSplits player={p} /> : null}
        {tab === 'GAME LOGS' ? (
          <>
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
          </>
        ) : null}
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
  roleDrop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C5C5C5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  roleDropText: {
    fontFamily: 'DMSans_700Bold',
    color: '#222',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  roleDropCaret: {
    fontFamily: 'DMSans_400Regular',
    color: '#666',
    fontSize: 12,
  },
  table: {
    backgroundColor: 'rgba(26, 47, 85, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  tableLabel: {
    width: 52,
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 12,
  },
  tableHead: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  tableVal: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.cream,
    fontSize: 14,
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

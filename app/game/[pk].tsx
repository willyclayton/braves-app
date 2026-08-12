import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TeamLogo } from '@/components/TeamLogo';
import { colors, spacing } from '@/constants/theme';
import { schedule } from '@/data/braves';
import { batterGameStamp, type GameStamp } from '@/lib/form';

export function generateStaticParams() {
  return schedule
    .map((g) => ({ pk: String(g.gamePk || g.id) }))
    .filter((g, i, arr) => arr.findIndex((x) => x.pk === g.pk) === i);
}

type BoxBatter = {
  id: number;
  name: string;
  number: string;
  pos: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
  battingOrder?: string;
};

type BoxPitcher = {
  id: number;
  name: string;
  ip: string;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
};

type BoxSide = {
  abbr: string;
  name: string;
  batters: BoxBatter[];
  pitchers: BoxPitcher[];
};

type BoxPayload = {
  status: string;
  date: string;
  venue: string;
  home: BoxSide;
  away: BoxSide;
  score: {
    home: number;
    away: number;
    homeHits?: number;
    awayHits?: number;
    homeErrors?: number;
    awayErrors?: number;
  };
  innings: { num: number; home: number | string; away: number | string }[];
  bravesSide: 'home' | 'away';
};

function batterTotals(rows: BoxBatter[]) {
  return rows.reduce(
    (a, b) => ({
      ab: a.ab + (b.ab || 0),
      r: a.r + (b.r || 0),
      h: a.h + (b.h || 0),
      rbi: a.rbi + (b.rbi || 0),
      bb: a.bb + (b.bb || 0),
      so: a.so + (b.so || 0),
    }),
    { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0 }
  );
}

function Stamp({ kind }: { kind: Exclude<GameStamp, null> }) {
  return (
    <View style={[styles.stamp, kind === 'good' ? styles.stampGood : styles.stampBad]}>
      <Text style={[styles.stampText, kind === 'good' ? styles.stampTextGood : styles.stampTextBad]}>
        {kind === 'good' ? 'GOOD' : 'BAD'}
      </Text>
    </View>
  );
}

function BatterTable({ rows }: { rows: BoxBatter[] }) {
  const totals = batterTotals(rows);
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Batting</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.thName]}>BATTER</Text>
        <Text style={styles.th}>AB</Text>
        <Text style={styles.th}>R</Text>
        <Text style={styles.th}>H</Text>
        <Text style={styles.th}>RBI</Text>
        <Text style={styles.th}>BB</Text>
        <Text style={styles.th}>SO</Text>
      </View>
      {rows.map((b) => {
        const sub = b.battingOrder != null && Number(b.battingOrder) % 100 > 0;
        const stamp = batterGameStamp(b);
        return (
          <View key={b.id} style={styles.tr}>
            <View style={[styles.td, styles.tdName]}>
              <Text style={styles.nameLine} numberOfLines={1}>
                {sub ? '  ' : ''}
                {b.name.split(' ').slice(-1)[0]} <Text style={styles.pos}>{b.pos}</Text>
              </Text>
              {stamp ? <Stamp kind={stamp} /> : null}
            </View>
            <Text style={styles.tdNum}>{b.ab ?? 0}</Text>
            <Text style={styles.tdNum}>{b.r ?? 0}</Text>
            <Text style={styles.tdNum}>{b.h ?? 0}</Text>
            <Text style={styles.tdNum}>{b.rbi ?? 0}</Text>
            <Text style={styles.tdNum}>{b.bb ?? 0}</Text>
            <Text style={styles.tdNum}>{b.so ?? 0}</Text>
          </View>
        );
      })}
      <View style={[styles.tr, styles.totalRow]}>
        <Text style={[styles.tdNameText, styles.totalLabel]}>TOTALS</Text>
        <Text style={[styles.tdNum, styles.totalVal]}>{totals.ab}</Text>
        <Text style={[styles.tdNum, styles.totalVal]}>{totals.r}</Text>
        <Text style={[styles.tdNum, styles.totalVal]}>{totals.h}</Text>
        <Text style={[styles.tdNum, styles.totalVal]}>{totals.rbi}</Text>
        <Text style={[styles.tdNum, styles.totalVal]}>{totals.bb}</Text>
        <Text style={[styles.tdNum, styles.totalVal]}>{totals.so}</Text>
      </View>
    </View>
  );
}

function PitcherTable({ rows }: { rows: BoxPitcher[] }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>Pitching</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.thName]}>PITCHER</Text>
        <Text style={styles.th}>IP</Text>
        <Text style={styles.th}>H</Text>
        <Text style={styles.th}>R</Text>
        <Text style={styles.th}>ER</Text>
        <Text style={styles.th}>BB</Text>
        <Text style={styles.th}>SO</Text>
      </View>
      {rows.map((p) => (
        <View key={p.id} style={styles.tr}>
          <Text style={[styles.tdNameText]} numberOfLines={1}>
            {p.name.split(' ').slice(-1)[0]}
          </Text>
          <Text style={styles.tdNum}>{p.ip ?? '—'}</Text>
          <Text style={styles.tdNum}>{p.h ?? 0}</Text>
          <Text style={styles.tdNum}>{p.r ?? 0}</Text>
          <Text style={styles.tdNum}>{p.er ?? 0}</Text>
          <Text style={styles.tdNum}>{p.bb ?? 0}</Text>
          <Text style={styles.tdNum}>{p.so ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}

export default function GameScreen() {
  const { pk } = useLocalSearchParams<{ pk: string }>();
  const meta = schedule.find((g) => String(g.gamePk) === String(pk) || g.id === pk);
  const [box, setBox] = useState<BoxPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState<'home' | 'away' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/game/${pk}`);
        if (!res.ok) throw new Error('Box score unavailable');
        const json = (await res.json()) as BoxPayload;
        if (!cancelled) {
          setBox(json);
          setSide(json.bravesSide || 'home');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pk]);

  const activeSide: BoxSide | null = useMemo(() => {
    if (!box || !side) return null;
    return side === 'home' ? box.home : box.away;
  }, [box, side]);

  const title = meta
    ? `${meta.home ? 'vs' : '@'} ${meta.opponentAbbr}`
    : 'Game';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontFamily: 'DMSans_700Bold' },
        }}
      />
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {meta ? (
            <View style={styles.scoreHero}>
              <View style={styles.side}>
                <TeamLogo abbr="ATL" size={48} />
                <Text style={styles.abbr}>ATL</Text>
              </View>
              <View style={styles.scoreMid}>
                {meta.status === 'final' && meta.bravesScore != null ? (
                  <Text style={styles.scoreLine}>
                    {meta.bravesScore}–{meta.oppScore}
                  </Text>
                ) : (
                  <Text style={styles.scoreLine}>{meta.time}</Text>
                )}
                <Text style={styles.metaLine}>
                  {meta.date} · {meta.venue}
                </Text>
              </View>
              <View style={styles.side}>
                <TeamLogo abbr={meta.opponentAbbr} size={48} />
                <Text style={styles.abbr}>{meta.opponentAbbr}</Text>
              </View>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: 40 }} />
          ) : error ? (
            <Text style={styles.error}>
              {meta?.status === 'upcoming'
                ? 'Box score posts after first pitch.'
                : error}
            </Text>
          ) : box ? (
            <>
              {box.innings?.length ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.lineWrap}
                >
                  <View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineTeam}> </Text>
                      {box.innings.map((inn) => (
                        <Text key={inn.num} style={styles.lineCell}>
                          {inn.num}
                        </Text>
                      ))}
                      <Text style={styles.lineCell}>R</Text>
                      <Text style={styles.lineCell}>H</Text>
                      <Text style={styles.lineCell}>E</Text>
                    </View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineTeam}>{box.away.abbr}</Text>
                      {box.innings.map((inn) => (
                        <Text key={`a${inn.num}`} style={styles.lineCell}>
                          {inn.away}
                        </Text>
                      ))}
                      <Text style={[styles.lineCell, styles.lineBold]}>{box.score.away}</Text>
                      <Text style={[styles.lineCell, styles.lineBold]}>
                        {box.score.awayHits ?? '—'}
                      </Text>
                      <Text style={[styles.lineCell, styles.lineBold]}>
                        {box.score.awayErrors ?? '—'}
                      </Text>
                    </View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineTeam}>{box.home.abbr}</Text>
                      {box.innings.map((inn) => (
                        <Text key={`h${inn.num}`} style={styles.lineCell}>
                          {inn.home}
                        </Text>
                      ))}
                      <Text style={[styles.lineCell, styles.lineBold]}>{box.score.home}</Text>
                      <Text style={[styles.lineCell, styles.lineBold]}>
                        {box.score.homeHits ?? '—'}
                      </Text>
                      <Text style={[styles.lineCell, styles.lineBold]}>
                        {box.score.homeErrors ?? '—'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              ) : null}

              <View style={styles.teamToggle}>
                {(['away', 'home'] as const).map((key) => {
                  const team = key === 'away' ? box.away : box.home;
                  const on = side === key;
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSide(key)}
                      style={[styles.teamSeg, on && styles.teamSegOn]}
                    >
                      <TeamLogo abbr={team.abbr} size={22} />
                      <Text style={[styles.teamSegText, on && styles.teamSegTextOn]}>
                        {team.abbr}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {activeSide ? (
                <>
                  <BatterTable rows={activeSide.batters} />
                  <PitcherTable rows={activeSide.pitchers} />
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  content: { padding: spacing.lg, paddingBottom: 48 },
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  side: { alignItems: 'center', gap: 6, width: 72 },
  abbr: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 20,
  },
  scoreMid: { alignItems: 'center', flex: 1 },
  scoreLine: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 44,
  },
  metaLine: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    textAlign: 'center',
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    textAlign: 'center',
    marginTop: 24,
  },
  lineWrap: { marginBottom: spacing.md },
  lineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  lineTeam: {
    width: 40,
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 12,
  },
  lineCell: {
    width: 28,
    textAlign: 'center',
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 12,
  },
  lineBold: { color: colors.white, fontFamily: 'DMSans_700Bold' },
  teamToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  teamSeg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    backgroundColor: colors.navyLift,
  },
  teamSegOn: {
    backgroundColor: colors.scarlet,
    borderColor: colors.scarlet,
  },
  teamSegText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  teamSegTextOn: { color: colors.white },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 2,
    paddingTop: 8,
  },
  totalLabel: { color: colors.gold, fontFamily: 'DMSans_700Bold' },
  totalVal: { color: colors.white, fontFamily: 'DMSans_700Bold' },
  block: { marginBottom: spacing.xl },
  blockTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 22,
    marginBottom: 8,
  },
  tableHead: { flexDirection: 'row', marginBottom: 6, alignItems: 'center' },
  th: {
    width: 32,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 10,
  },
  thName: { flex: 1, width: undefined, textAlign: 'left' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  td: {
    flex: 1,
  },
  tdName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 4,
    minWidth: 0,
  },
  nameLine: {
    flexShrink: 1,
    color: colors.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
  },
  tdNameText: {
    flex: 1,
    color: colors.white,
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
  },
  tdNum: {
    width: 32,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 12,
  },
  pos: { color: colors.gold, fontFamily: 'DMSans_500Medium' },
  stamp: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  stampGood: {
    backgroundColor: 'rgba(61, 220, 132, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(61, 220, 132, 0.45)',
  },
  stampBad: {
    backgroundColor: 'rgba(255, 90, 106, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 90, 106, 0.4)',
  },
  stampText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 8,
    letterSpacing: 0.6,
  },
  stampTextGood: { color: colors.success },
  stampTextBad: { color: colors.danger },
});

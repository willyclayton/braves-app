import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TeamLogo } from '@/components/TeamLogo';
import { colors, spacing } from '@/constants/theme';
import { schedule } from '@/data/braves';

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

type BoxPayload = {
  status: string;
  date: string;
  venue: string;
  home: { abbr: string; name: string; batters: BoxBatter[]; pitchers: BoxPitcher[] };
  away: { abbr: string; name: string; batters: BoxBatter[]; pitchers: BoxPitcher[] };
  score: { home: number; away: number };
  innings: { num: number; home: number | string; away: number | string }[];
  bravesSide: 'home' | 'away';
};

function BatterTable({ title, rows }: { title: string; rows: BoxBatter[] }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.thName]}>BATTER</Text>
        <Text style={styles.th}>AB</Text>
        <Text style={styles.th}>R</Text>
        <Text style={styles.th}>H</Text>
        <Text style={styles.th}>RBI</Text>
        <Text style={styles.th}>BB</Text>
        <Text style={styles.th}>SO</Text>
      </View>
      {rows.map((b) => (
        <View key={b.id} style={styles.tr}>
          <Text style={[styles.td, styles.tdName]} numberOfLines={1}>
            {b.name.split(' ').slice(-1)[0]} <Text style={styles.pos}>{b.pos}</Text>
          </Text>
          <Text style={styles.td}>{b.ab ?? 0}</Text>
          <Text style={styles.td}>{b.r ?? 0}</Text>
          <Text style={styles.td}>{b.h ?? 0}</Text>
          <Text style={styles.td}>{b.rbi ?? 0}</Text>
          <Text style={styles.td}>{b.bb ?? 0}</Text>
          <Text style={styles.td}>{b.so ?? 0}</Text>
        </View>
      ))}
    </View>
  );
}

function PitcherTable({ title, rows }: { title: string; rows: BoxPitcher[] }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
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
          <Text style={[styles.td, styles.tdName]} numberOfLines={1}>
            {p.name.split(' ').slice(-1)[0]}
          </Text>
          <Text style={styles.td}>{p.ip ?? '—'}</Text>
          <Text style={styles.td}>{p.h ?? 0}</Text>
          <Text style={styles.td}>{p.r ?? 0}</Text>
          <Text style={styles.td}>{p.er ?? 0}</Text>
          <Text style={styles.td}>{p.bb ?? 0}</Text>
          <Text style={styles.td}>{p.so ?? 0}</Text>
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/game/${pk}`);
        if (!res.ok) throw new Error('Box score unavailable');
        const json = await res.json();
        if (!cancelled) setBox(json);
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lineWrap}>
                  <View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineTeam}> </Text>
                      {box.innings.map((inn) => (
                        <Text key={inn.num} style={styles.lineCell}>
                          {inn.num}
                        </Text>
                      ))}
                      <Text style={styles.lineCell}>R</Text>
                    </View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineTeam}>{box.away.abbr}</Text>
                      {box.innings.map((inn) => (
                        <Text key={`a${inn.num}`} style={styles.lineCell}>
                          {inn.away}
                        </Text>
                      ))}
                      <Text style={[styles.lineCell, styles.lineBold]}>{box.score.away}</Text>
                    </View>
                    <View style={styles.lineRow}>
                      <Text style={styles.lineTeam}>{box.home.abbr}</Text>
                      {box.innings.map((inn) => (
                        <Text key={`h${inn.num}`} style={styles.lineCell}>
                          {inn.home}
                        </Text>
                      ))}
                      <Text style={[styles.lineCell, styles.lineBold]}>{box.score.home}</Text>
                    </View>
                  </View>
                </ScrollView>
              ) : null}

              <BatterTable title={`${box.away.abbr} batting`} rows={box.away.batters} />
              <BatterTable title={`${box.home.abbr} batting`} rows={box.home.batters} />
              <PitcherTable title={`${box.away.abbr} pitching`} rows={box.away.pitchers} />
              <PitcherTable title={`${box.home.abbr} pitching`} rows={box.home.pitchers} />
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
  lineWrap: { marginBottom: spacing.lg },
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
  block: { marginBottom: spacing.xl },
  blockTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 22,
    marginBottom: 8,
  },
  tableHead: { flexDirection: 'row', marginBottom: 6 },
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
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  td: {
    width: 32,
    textAlign: 'right',
    fontFamily: 'DMSans_500Medium',
    color: colors.mist,
    fontSize: 12,
  },
  tdName: {
    flex: 1,
    width: undefined,
    textAlign: 'left',
    color: colors.white,
    fontFamily: 'DMSans_700Bold',
  },
  pos: { color: colors.gold, fontFamily: 'DMSans_500Medium' },
});

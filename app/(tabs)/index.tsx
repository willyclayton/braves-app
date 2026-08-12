import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
import { PlayerHeadshot } from '@/components/PlayerHeadshot';
import { TeamLogo } from '@/components/TeamLogo';
import { FadeIn } from '@/components/ui/FadeIn';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import {
  dataAsOf,
  hitters,
  pitchers,
  schedule,
  teamPulse,
  WINDOW_KEYS,
  WINDOW_LABELS,
  type Hitter,
  type Pitcher,
  type WindowKey,
} from '@/data/braves';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';
import { etDateString, formatShortDate, gameDayLabel } from '@/lib/dates';
import {
  formFromHitWindow,
  formFromPitchWindow,
  formLabel,
  parseInnings,
} from '@/lib/form';
import { resultLabel } from '@/lib/gameWindow';
import { shortName } from '@/lib/names';
import { resolveHitWindow, resolvePitchWindow } from '@/lib/windows';

type Role = 'batters' | 'pitchers';

function matchesQuery(
  player: { name: string; pos: string; number?: number },
  q: string
) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return (
    player.name.toLowerCase().includes(n) ||
    shortName(player.name).toLowerCase().includes(n) ||
    player.pos.toLowerCase().includes(n) ||
    String(player.number ?? '').includes(n)
  );
}

function nearbyGames(now = new Date()) {
  const today = etDateString(now);
  const finals = schedule.filter((g) => g.status === 'final');
  const upcoming = schedule.filter((g) => g.status === 'upcoming' || g.status === 'live');
  const yesterday = [...finals].reverse().find((g) => g.date < today) || finals[finals.length - 1];
  const todayGame =
    schedule.find((g) => g.date === today && (g.status === 'live' || g.status === 'upcoming')) ||
    finals.find((g) => g.date === today);
  const tomorrow =
    upcoming.find((g) => g.date > today) ||
    upcoming.find((g) => g !== todayGame);

  const cards: { key: string; label: string; game: (typeof schedule)[0] }[] = [];
  if (yesterday) cards.push({ key: 'y', label: 'Last', game: yesterday });
  if (todayGame && todayGame.id !== yesterday?.id) {
    cards.push({
      key: 't',
      label: todayGame.status === 'final' ? 'Today' : gameDayLabel(todayGame.date, now),
      game: todayGame,
    });
  }
  if (tomorrow && tomorrow.id !== todayGame?.id) {
    cards.push({
      key: 'n',
      label: gameDayLabel(tomorrow.date, now) === 'Tonight' ? 'Tonight' : gameDayLabel(tomorrow.date, now),
      game: tomorrow,
    });
  }
  return cards.slice(0, 3);
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segRow}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[styles.seg, value === o.key && styles.segOn]}
        >
          <Text style={[styles.segText, value === o.key && styles.segTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function MiniStats({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={styles.miniStats}>
      {items.map((it) => (
        <View key={it.label} style={styles.miniStat}>
          <Text style={styles.miniLabel}>{it.label}</Text>
          <Text style={styles.miniValue}>{it.value}</Text>
        </View>
      ))}
    </View>
  );
}

function GameCard({
  label,
  game,
}: {
  label: string;
  game: (typeof schedule)[0];
}) {
  const result = resultLabel(game);
  return (
    <Link
      href={{ pathname: '/game/[pk]', params: { pk: String(game.gamePk || game.id) } }}
      asChild
    >
      <Pressable style={styles.gameCard}>
        <Text style={styles.gameLabel}>{label.toUpperCase()}</Text>
        <View style={styles.gameMatch}>
          <TeamLogo abbr={game.opponentAbbr} size={28} />
          <Text style={styles.gameOpp}>
            {game.home ? 'vs' : '@'} {game.opponentAbbr}
          </Text>
        </View>
        {result ? (
          <Text style={[styles.gameScore, result.win ? styles.win : styles.loss]}>
            {result.text} {result.score}
          </Text>
        ) : (
          <Text style={styles.gameTime}>{game.time}</Text>
        )}
        <Text style={styles.gameDate}>{formatShortDate(game.date)}</Text>
      </Pressable>
    </Link>
  );
}

function HitterRow({ player, window }: { player: Hitter; window: WindowKey }) {
  const w = resolveHitWindow(player, window);
  const form = formFromHitWindow(w);
  return (
    <Link
      href={{
        pathname: '/player/[id]',
        params: { id: String(player.id), window },
      }}
      asChild
    >
      <Pressable style={styles.playerRow}>
        <PlayerHeadshot id={player.id} name={player.name} pos={player.pos} size={44} />
        <View style={styles.playerMain}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{shortName(player.name)}</Text>
            <Text style={styles.posText}>{player.pos}</Text>
            {form !== 'neutral' ? (
              <Text
                style={[
                  styles.formTag,
                  form === 'hot' && styles.formHot,
                  form === 'cold' && styles.formCold,
                ]}
              >
                {formLabel(form)}
              </Text>
            ) : null}
          </View>
          <MiniStats
            items={[
              { label: 'H-AB', value: `${w.h}-${w.ab}` },
              { label: 'AVG', value: w.avg },
              { label: 'OPS', value: w.ops },
              { label: 'HR', value: String(w.hr) },
            ]}
          />
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Link>
  );
}

function PitcherRow({ player, window }: { player: Pitcher; window: WindowKey }) {
  const w = resolvePitchWindow(player, window);
  const form = formFromPitchWindow(w);
  return (
    <Link
      href={{
        pathname: '/player/[id]',
        params: { id: String(player.id), window },
      }}
      asChild
    >
      <Pressable style={styles.playerRow}>
        <PlayerHeadshot id={player.id} name={player.name} pos={player.pos} size={44} />
        <View style={styles.playerMain}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{shortName(player.name)}</Text>
            <Text style={styles.posText}>{player.pos}</Text>
            {form !== 'neutral' ? (
              <Text
                style={[
                  styles.formTag,
                  form === 'hot' && styles.formHot,
                  form === 'cold' && styles.formCold,
                ]}
              >
                {formLabel(form)}
              </Text>
            ) : null}
          </View>
          <MiniStats
            items={[
              { label: 'IP', value: w.ip },
              { label: 'ERA', value: w.era },
              { label: 'WHIP', value: w.whip },
              { label: 'K', value: String(w.so) },
            ]}
          />
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const { pagePad } = usePhoneLayout();
  const [role, setRole] = useState<Role>('batters');
  const [window, setWindow] = useState<WindowKey>('l10');
  const [query, setQuery] = useState('');
  const games = useMemo(() => nearbyGames(), []);
  const searching = query.trim().length > 0;

  const batterList = useMemo(() => {
    return [...hitters]
      .filter((p) => matchesQuery(p, query))
      .sort((a, b) => {
        const aw = resolveHitWindow(a, window);
        const bw = resolveHitWindow(b, window);
        const af = formFromHitWindow(aw);
        const bf = formFromHitWindow(bw);
        const rank = (f: string) => (f === 'hot' ? 0 : f === 'neutral' ? 1 : 2);
        if (rank(af) !== rank(bf)) return rank(af) - rank(bf);
        return parseFloat(bw?.ops || '0') - parseFloat(aw?.ops || '0');
      });
  }, [window, query]);

  const pitcherList = useMemo(() => {
    return [...pitchers]
      .filter((p) => matchesQuery(p, query))
      .sort((a, b) => {
        const aw = resolvePitchWindow(a, window);
        const bw = resolvePitchWindow(b, window);
        const byIp = parseInnings(bw?.ip) - parseInnings(aw?.ip);
        if (byIp !== 0) return byIp;
        return parseFloat(aw?.era || '99') - parseFloat(bw?.era || '99');
      });
  }, [window, query]);

  const showBatters = searching || role === 'batters';
  const showPitchers = searching || role === 'pitchers';
  const noHits = searching && batterList.length === 0 && pitcherList.length === 0;

  return (
    <Screen>
      <FadeIn>
        <BrandMark size="lg" record={teamPulse.record} />
        <Text style={styles.pulseLine}>
          {teamPulse.rank} · {teamPulse.streak} · L10 {teamPulse.lastTen}
        </Text>
      </FadeIn>

      {!searching ? (
        <FadeIn delay={40} style={[styles.gamesBleed, { marginHorizontal: -pagePad }]}>
          <View style={[styles.gamesRow, { paddingHorizontal: pagePad }]}>
            {games.map((g) => (
              <GameCard key={g.key} label={g.label} game={g.game} />
            ))}
          </View>
        </FadeIn>
      ) : null}

      <FadeIn delay={80}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.sectionSub}>Tap anyone for game-by-game trends</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.mist} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search players"
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="never"
            style={styles.searchInput}
            accessibilityLabel="Search players"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={colors.mist} />
            </Pressable>
          ) : null}
        </View>

        {!searching ? (
          <Seg
            value={role}
            onChange={setRole}
            options={[
              { key: 'batters', label: 'Batters' },
              { key: 'pitchers', label: 'Pitchers' },
            ]}
          />
        ) : null}
        <Seg
          value={window}
          onChange={setWindow}
          options={WINDOW_KEYS.map((k) => ({ key: k, label: WINDOW_LABELS[k] }))}
        />
      </FadeIn>

      <FadeIn delay={120}>
        {noHits ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No players match “{query.trim()}”</Text>
            <Pressable onPress={() => setQuery('')}>
              <Text style={styles.emptyAction}>Clear search</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {showBatters && batterList.length > 0 ? (
              <>
                {searching ? <Text style={styles.groupLabel}>Batters</Text> : null}
                {batterList.map((p) => (
                  <HitterRow key={p.id} player={p} window={window} />
                ))}
              </>
            ) : null}
            {showPitchers && pitcherList.length > 0 ? (
              <>
                {searching ? <Text style={styles.groupLabel}>Pitchers</Text> : null}
                {pitcherList.map((p) => (
                  <PitcherRow key={p.id} player={p} window={window} />
                ))}
              </>
            ) : null}
          </>
        )}
      </FadeIn>

      <Text style={styles.asOf}>Updated {dataAsOf}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pulseLine: {
    fontFamily: 'DMSans_400Regular',
    color: colors.cream,
    fontSize: 14,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  gamesBleed: { marginBottom: spacing.lg },
  gamesRow: { flexDirection: 'row', gap: 10 },
  gameCard: {
    flex: 1,
    backgroundColor: colors.navyLift,
    borderRadius: 14,
    padding: 12,
    minHeight: 112,
  },
  gameLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  gameMatch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  gameOpp: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 13,
  },
  gameScore: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    marginTop: 8,
  },
  win: { color: colors.success },
  loss: { color: colors.danger },
  gameTime: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 15,
    marginTop: 8,
  },
  gameDate: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 32,
    letterSpacing: 1,
  },
  sectionSub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 14,
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.navyLift,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: 12,
    minHeight: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    color: colors.cream,
    fontSize: 15,
    paddingVertical: 10,
  },
  segRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  seg: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    alignItems: 'center',
    minHeight: 42,
    justifyContent: 'center',
  },
  segOn: { backgroundColor: colors.scarlet, borderColor: colors.scarlet },
  segText: { fontFamily: 'DMSans_700Bold', color: colors.mist, fontSize: 13 },
  segTextOn: { color: colors.white },
  groupLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  posText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  playerMain: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  playerName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 16,
  },
  formTag: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.mist,
  },
  formHot: { color: '#FF8A4C' },
  formCold: { color: '#7EC8FF' },
  miniStats: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 12,
  },
  miniStat: {
    flex: 1,
  },
  miniLabel: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 0.6,
  },
  miniValue: {
    fontFamily: 'DMSans_500Medium',
    color: colors.cream,
    fontSize: 14,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  chev: {
    fontFamily: 'DMSans_400Regular',
    color: colors.textFaint,
    fontSize: 22,
  },
  empty: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyAction: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 14,
  },
  asOf: {
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 12,
  },
});

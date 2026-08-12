import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '@/components/BrandMark';
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
  formGlyph,
  formLabel,
} from '@/lib/form';
import { resultLabel } from '@/lib/gameWindow';

type Role = 'batters' | 'pitchers';

function shortName(full: string) {
  const parts = full.replace(/\./g, '').split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (/^(jr|sr|ii|iii|iv)$/i.test(last) && parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return last;
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
  const w =
    player.windows[window] ||
    player.windows.l5 ||
    player.windows.l10 ||
    player.windows.l20 ||
    player.windows.l30 ||
    player.season;
  const form = formFromHitWindow(
    player.windows[window] || player.windows.l10 || player.windows.l5
  );
  const glyph = formGlyph(form);
  return (
    <Link href={{ pathname: '/player/[id]', params: { id: String(player.id) } }} asChild>
      <Pressable style={styles.playerRow}>
        <View style={styles.posBubble}>
          <Text style={styles.posText}>{player.pos}</Text>
        </View>
        <View style={styles.playerMain}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{shortName(player.name)}</Text>
            {glyph ? <Text style={styles.glyph}>{glyph}</Text> : null}
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
          <Text style={styles.playerMeta}>
            {WINDOW_LABELS[window]} {w.h}-{w.ab} · {w.avg} AVG · {w.ops} OPS · {w.hr} HR
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </Link>
  );
}

function PitcherRow({ player, window }: { player: Pitcher; window: WindowKey }) {
  const w = player.windows[window] || player.windows.l10 || player.season;
  const form = formFromPitchWindow(player.windows[window] || player.windows.l10);
  const glyph = formGlyph(form);
  return (
    <Link href={{ pathname: '/player/[id]', params: { id: String(player.id) } }} asChild>
      <Pressable style={styles.playerRow}>
        <View style={styles.posBubble}>
          <Text style={styles.posText}>{player.pos}</Text>
        </View>
        <View style={styles.playerMain}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{shortName(player.name)}</Text>
            {glyph ? <Text style={styles.glyph}>{glyph}</Text> : null}
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
          <Text style={styles.playerMeta}>
            {WINDOW_LABELS[window]} {w.era} ERA · {w.whip} WHIP · {w.so} K · {w.ip} IP
          </Text>
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
  const games = useMemo(() => nearbyGames(), []);

  const batterList = useMemo(() => {
    return [...hitters].sort((a, b) => {
      const aw = a.windows[window];
      const bw = b.windows[window];
      const af = formFromHitWindow(aw);
      const bf = formFromHitWindow(bw);
      const rank = (f: string) => (f === 'hot' ? 0 : f === 'neutral' ? 1 : 2);
      if (rank(af) !== rank(bf)) return rank(af) - rank(bf);
      return parseFloat(bw?.ops || '0') - parseFloat(aw?.ops || '0');
    });
  }, [window]);

  const pitcherList = useMemo(() => {
    return [...pitchers].sort((a, b) => {
      const aw = a.windows[window];
      const bw = b.windows[window];
      const af = formFromPitchWindow(aw);
      const bf = formFromPitchWindow(bw);
      const rank = (f: string) => (f === 'hot' ? 0 : f === 'neutral' ? 1 : 2);
      if (rank(af) !== rank(bf)) return rank(af) - rank(bf);
      return parseFloat(aw?.era || '99') - parseFloat(bw?.era || '99');
    });
  }, [window]);

  return (
    <Screen>
      <FadeIn>
        <BrandMark size="lg" record={teamPulse.record} />
        <Text style={styles.pulseLine}>
          {teamPulse.rank} · {teamPulse.streak} · L10 {teamPulse.lastTen}
        </Text>
      </FadeIn>

      <FadeIn delay={40} style={[styles.gamesBleed, { marginHorizontal: -pagePad }]}>
        <View style={[styles.gamesRow, { paddingHorizontal: pagePad }]}>
          {games.map((g) => (
            <GameCard key={g.key} label={g.label} game={g.game} />
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={80}>
        <Text style={styles.sectionTitle}>Players</Text>
        <Text style={styles.sectionSub}>Tap anyone for game-by-game trends</Text>

        <Seg
          value={role}
          onChange={setRole}
          options={[
            { key: 'batters', label: 'Batters' },
            { key: 'pitchers', label: 'Pitchers' },
          ]}
        />
        <Seg
          value={window}
          onChange={setWindow}
          options={WINDOW_KEYS.map((k) => ({ key: k, label: WINDOW_LABELS[k] }))}
        />
      </FadeIn>

      <FadeIn delay={120}>
        {role === 'batters'
          ? batterList.map((p) => <HitterRow key={p.id} player={p} window={window} />)
          : pitcherList.map((p) => <PitcherRow key={p.id} player={p} window={window} />)}
      </FadeIn>

      <Text style={styles.asOf}>Updated {dataAsOf}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pulseLine: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
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
    fontSize: 10,
    letterSpacing: 1.4,
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
    color: colors.mistDim,
    fontSize: 11,
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
    fontSize: 13,
    marginBottom: 12,
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
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  posBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.navyLift,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.gold,
    fontSize: 16,
  },
  playerMain: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  playerName: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 16,
  },
  glyph: { fontSize: 13 },
  formTag: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: colors.mistDim,
  },
  formHot: { color: '#FF8A4C' },
  formCold: { color: '#7EC8FF' },
  playerMeta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 3,
  },
  chev: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 22,
  },
  asOf: {
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    color: colors.mistDim,
    fontSize: 11,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { colors, radii, spacing } from '@/constants/theme';
import type { OriginStint, PlayerOrigin } from '@/lib/origin';
import { yearRange } from '@/lib/origin';

type Props = {
  playerId: number;
  playerName: string;
  group: 'hitting' | 'pitching';
};

function logoAbbr(stint: OriginStint) {
  return stint.orgAbbr || stint.abbr;
}

function StintRow({ stint }: { stint: OriginStint }) {
  const abbr = logoAbbr(stint);
  const years = stint.from ? yearRange(stint.from, stint.to) : '—';
  const title =
    stint.kind === 'draft'
      ? stint.note || `Drafted by ${stint.team}`
      : stint.kind === 'college'
        ? stint.team
        : stint.team;
  const sub =
    stint.kind === 'draft'
      ? stint.team
      : stint.kind === 'college'
        ? 'College'
        : [stint.level, stint.kind === 'minors' && stint.org ? stint.org : null, stint.summary]
            .filter(Boolean)
            .join(' · ');

  return (
    <View style={styles.stint}>
      <Text style={styles.years}>{years}</Text>
      {abbr && stint.kind !== 'college' ? (
        <TeamLogo abbr={abbr} size={28} />
      ) : (
        <View style={styles.logoSpacer} />
      )}
      <View style={styles.stintBody}>
        <Text style={styles.stintTeam}>{title}</Text>
        {sub ? <Text style={styles.stintSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function PlayerOriginButton({ playerId, playerName, group }: Props) {
  const [open, setOpen] = useState(false);
  const [showMinors, setShowMinors] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<PlayerOrigin | null>(null);

  const load = useCallback(async () => {
    setOpen(true);
    if (origin || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/player/${playerId}?group=${group}`);
      if (!res.ok) throw new Error('History unavailable');
      const json = (await res.json()) as PlayerOrigin;
      setOrigin(json);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [group, loading, origin, playerId]);

  const visible = (origin?.stints || []).filter((s) => {
    if (s.kind === 'minors') return showMinors;
    return true;
  });

  const hasMinors = (origin?.stints || []).some((s) => s.kind === 'minors');

  return (
    <>
      <Pressable
        onPress={load}
        hitSlop={8}
        style={styles.infoBtn}
        accessibilityLabel={`Where ${playerName} came from`}
      >
        <Ionicons name="information-circle-outline" size={22} color={colors.gold} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.kicker}>WHERE DID HE COME FROM?</Text>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {playerName}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={colors.mist} />
              </Pressable>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.gold} style={{ marginVertical: 28 }} />
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : origin ? (
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <Text style={styles.summary}>{origin.summary}</Text>
                {origin.birthplace ? (
                  <Text style={styles.meta}>
                    Born {origin.birthplace}
                    {origin.debut ? ` · MLB debut ${origin.debut}` : ''}
                  </Text>
                ) : origin.debut ? (
                  <Text style={styles.meta}>MLB debut {origin.debut}</Text>
                ) : null}

                {hasMinors ? (
                  <Pressable
                    onPress={() => setShowMinors((v) => !v)}
                    style={[styles.toggle, showMinors && styles.toggleOn]}
                  >
                    <Text style={[styles.toggleText, showMinors && styles.toggleTextOn]}>
                      {showMinors ? 'Hide minor league teams' : 'Show minor league teams'}
                    </Text>
                  </Pressable>
                ) : null}

                {visible.map((stint, i) => (
                  <StintRow
                    key={`${stint.kind}-${stint.teamId || stint.team}-${stint.from}-${i}`}
                    stint={stint}
                  />
                ))}
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  infoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(234, 170, 0, 0.45)',
    backgroundColor: colors.navyLift,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 16, 0.72)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.navyMid,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    maxHeight: '86%',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 8,
  },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.4,
  },
  sheetTitle: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 28,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: spacing.md,
    maxHeight: 520,
  },
  summary: {
    fontFamily: 'DMSans_400Regular',
    color: colors.cream,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  meta: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginBottom: 12,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    marginBottom: 12,
  },
  toggleOn: {
    backgroundColor: colors.scarlet,
    borderColor: colors.scarlet,
  },
  toggleText: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 13,
  },
  toggleTextOn: { color: colors.white },
  stint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  years: {
    width: 78,
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 13,
  },
  logoSpacer: { width: 28, height: 28 },
  stintBody: { flex: 1, minWidth: 0 },
  stintTeam: {
    fontFamily: 'DMSans_700Bold',
    color: colors.white,
    fontSize: 15,
  },
  stintSub: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 2,
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    textAlign: 'center',
    padding: 24,
  },
});

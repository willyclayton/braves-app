import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SavantPercentiles } from '@/components/SavantPercentiles';
import { SavantRolling } from '@/components/SavantRolling';
import { SavantSpray } from '@/components/SavantSpray';
import type { PlayerSpray } from '@/lib/spray';
import type { SavantGroup, SavantProfile } from '@/lib/savant';

type Props = {
  playerId: number;
  group: SavantGroup;
};

export function SavantEmbed({ playerId, group }: Props) {
  const [profile, setProfile] = useState<SavantProfile | null>(null);
  const [spray, setSpray] = useState<PlayerSpray | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [savantRes, sprayRes] = await Promise.all([
        fetch(`/api/player/${playerId}?group=${group}&view=savant`),
        fetch(`/api/player/${playerId}?group=${group}&view=spray`),
      ]);
      if (!savantRes.ok) throw new Error('Savant data unavailable');
      const savantJson = (await savantRes.json()) as SavantProfile;
      setProfile(savantJson);
      if (sprayRes.ok) {
        setSpray((await sprayRes.json()) as PlayerSpray);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load Statcast');
    } finally {
      setLoading(false);
    }
  }, [group, playerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#3D8E91" />
      </View>
    );
  }

  if (error && !profile) {
    return <Text style={styles.error}>{error}</Text>;
  }

  return (
    <View>
      {profile?.sections.length ? (
        <SavantPercentiles season={profile.season} sections={profile.sections} />
      ) : null}

      <View style={styles.visuals}>
        <SavantSpray
          season={profile?.season ?? spray?.season ?? 2026}
          events={spray?.events ?? []}
          isPitcher={group === 'pitching'}
        />
        <View style={styles.divider} />
        <SavantRolling data={profile?.rolling ?? null} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  error: {
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(245, 240, 232, 0.72)',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
  },
  visuals: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C5DDDE',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    marginBottom: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D8D8D8',
    marginVertical: 6,
  },
});

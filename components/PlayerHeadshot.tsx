import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { headshotUri } from '@/lib/headshot';

type Props = {
  id?: number | null;
  name?: string;
  pos?: string;
  size?: number;
};

export function PlayerHeadshot({ id, name, pos, size = 40 }: Props) {
  const [failed, setFailed] = useState(false);
  const radius = size / 2;

  if (!id || failed) {
    return (
      <View
        style={[
          styles.fallback,
          { width: size, height: size, borderRadius: radius },
        ]}
      >
        <Text style={[styles.fallbackText, { fontSize: Math.max(10, size * 0.32) }]}>
          {pos || '—'}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: headshotUri(id, size * 2) }}
      resizeMode="cover"
      style={[
        styles.img,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
      onError={() => setFailed(true)}
      accessibilityLabel={name ? `${name} headshot` : 'Player headshot'}
    />
  );
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: colors.navyLift,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(234, 170, 0, 0.35)',
    overflow: 'hidden',
  },
  fallback: {
    backgroundColor: colors.navyLift,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  fallbackText: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.gold,
  },
});

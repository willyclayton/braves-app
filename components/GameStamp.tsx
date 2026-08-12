import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { GameStamp as GameStampKind } from '@/lib/form';

export function GameStamp({ kind }: { kind: Exclude<GameStampKind, null> }) {
  const good = kind === 'good';
  return (
    <View style={[styles.stamp, good ? styles.stampGood : styles.stampBad]}>
      <Text style={[styles.stampText, good ? styles.stampTextGood : styles.stampTextBad]}>
        {good ? 'GOOD' : 'BAD'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    paddingHorizontal: 6,
    paddingVertical: 3,
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
    fontSize: 9,
    letterSpacing: 0.6,
  },
  stampTextGood: { color: colors.success },
  stampTextBad: { color: colors.danger },
});

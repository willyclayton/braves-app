import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  size?: 'sm' | 'lg';
};

export function BrandMark({ size = 'sm' }: Props) {
  const large = size === 'lg';
  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, large && styles.badgeLg]}>
        <Text style={[styles.a, large && styles.aLg]}>A</Text>
      </View>
      <View>
        <Text style={[styles.word, large && styles.wordLg]}>BRAVES</Text>
        <Text style={[styles.sub, large && styles.subLg]}>ATLANTA</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.scarlet,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  badgeLg: {
    width: 64,
    height: 64,
    borderRadius: 20,
  },
  a: {
    fontFamily: 'ArchivoBlack_400Regular',
    color: colors.white,
    fontSize: 26,
    marginTop: 2,
  },
  aLg: {
    fontSize: 38,
  },
  word: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 34,
    letterSpacing: 2,
    lineHeight: 36,
  },
  wordLg: {
    fontSize: 56,
    lineHeight: 56,
    letterSpacing: 3,
  },
  sub: {
    fontFamily: 'DMSans_500Medium',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 4,
    marginTop: -2,
  },
  subLg: {
    fontSize: 13,
    letterSpacing: 6,
    marginTop: 2,
  },
});

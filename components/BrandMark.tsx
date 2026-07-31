import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Props = {
  size?: 'sm' | 'lg';
};

export function BrandMark({ size = 'sm' }: Props) {
  const { compact } = usePhoneLayout();
  const large = size === 'lg';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.badge,
          large && styles.badgeLg,
          compact && large && styles.badgeCompact,
        ]}
      >
        <Text style={[styles.a, large && styles.aLg, compact && large && styles.aCompact]}>
          A
        </Text>
      </View>
      <View>
        <Text
          style={[styles.word, large && styles.wordLg, compact && large && styles.wordCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          BRAVES
        </Text>
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
  badgeCompact: {
    width: 54,
    height: 54,
    borderRadius: 18,
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
  aCompact: {
    fontSize: 32,
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
  wordCompact: {
    fontSize: 46,
    lineHeight: 46,
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

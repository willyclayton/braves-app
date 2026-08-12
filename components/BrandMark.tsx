import { StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Props = {
  size?: 'sm' | 'lg';
  record?: string;
};

export function BrandMark({ size = 'sm', record }: Props) {
  const { compact } = usePhoneLayout();
  const large = size === 'lg';
  const logoSize = large ? (compact ? 52 : 60) : 36;

  return (
    <View style={styles.wrap}>
      <TeamLogo abbr="ATL" size={logoSize} />
      <View style={styles.textCol}>
        <Text
          style={[styles.word, large && styles.wordLg, compact && large && styles.wordCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          BRAVES
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.sub}>ATLANTA</Text>
          {record ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.record}>{record}</Text>
            </>
          ) : null}
        </View>
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
  textCol: {
    flexShrink: 1,
  },
  word: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 34,
    letterSpacing: 2,
    lineHeight: 34,
  },
  wordLg: {
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: 2.5,
  },
  wordCompact: {
    fontSize: 42,
    lineHeight: 42,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 3.5,
  },
  dot: {
    color: colors.mistDim,
    fontSize: 12,
  },
  record: {
    fontFamily: 'DMSans_500Medium',
    color: colors.cream,
    fontSize: 14,
  },
});

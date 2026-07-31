import { StyleSheet, Text } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { FadeIn } from '@/components/ui/FadeIn';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Props = {
  label: string;
  value: string;
  detail?: string;
  delay?: number;
};

export function StatChip({ label, value, detail, delay = 0 }: Props) {
  const { compact } = usePhoneLayout();

  return (
    <FadeIn
      delay={delay}
      style={[styles.wrap, compact ? styles.wrapCompact : styles.wrapWide]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  wrapWide: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
  },
  wrapCompact: {
    width: '48%',
    flexGrow: 0,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    color: colors.mistDim,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  value: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 28,
    marginTop: 4,
  },
  valueCompact: {
    fontSize: 30,
  },
  detail: {
    fontFamily: 'DMSans_400Regular',
    color: colors.gold,
    fontSize: 11,
    marginTop: 2,
  },
});

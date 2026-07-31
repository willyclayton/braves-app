import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { FadeIn } from '@/components/ui/FadeIn';

type Props = {
  label: string;
  value: string;
  detail?: string;
  delay?: number;
};

export function StatChip({ label, value, detail, delay = 0 }: Props) {
  return (
    <FadeIn delay={delay} style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: colors.line,
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
  detail: {
    fontFamily: 'DMSans_400Regular',
    color: colors.gold,
    fontSize: 11,
    marginTop: 2,
  },
});

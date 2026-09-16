import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import {
  magicCaption,
  magicDisplay,
  type MagicFigure,
  type TeamMagic,
} from '@/lib/magicNumber';

function MagicCard({
  label,
  figure,
  kind,
}: {
  label: string;
  figure: MagicFigure;
  kind: 'division' | 'playoffs';
}) {
  const value = magicDisplay(figure);
  const clinched = figure.status === 'clinched';
  const eliminated = figure.status === 'eliminated';
  const one = figure.status === 'magic' && figure.value === 1;

  return (
    <View
      style={[
        styles.card,
        clinched && styles.cardClinched,
        eliminated && styles.cardElim,
        one && styles.cardOne,
      ]}
      accessible={false}
    >
      <Text style={styles.kicker}>{label}</Text>
      <Text
        style={[
          styles.value,
          clinched && styles.valueClinched,
          eliminated && styles.valueElim,
          one && styles.valueOne,
          value.length > 4 && styles.valueLong,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={styles.caption}>{magicCaption(figure, kind)}</Text>
    </View>
  );
}

export function MagicNumbers({ magic }: { magic: TeamMagic }) {
  const divisionValue = magicDisplay(magic.division);
  const playoffValue = magicDisplay(magic.playoffs);

  return (
    <Link href="/standings" asChild>
      <Pressable
        style={styles.wrap}
        accessibilityRole="button"
        accessibilityLabel={`Magic numbers. Division ${divisionValue}, ${magicCaption(magic.division, 'division')}. Playoffs ${playoffValue}, ${magicCaption(magic.playoffs, 'playoffs')}. Open standings.`}
      >
        <Text style={styles.sectionKicker}>MAGIC NUMBER</Text>
        <View style={styles.row}>
          <MagicCard label="Division" figure={magic.division} kind="division" />
          <MagicCard label="Playoffs" figure={magic.playoffs} kind="playoffs" />
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  sectionKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 2.2,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: colors.navyLift,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    minHeight: 96,
  },
  cardClinched: {
    borderColor: 'rgba(61, 220, 132, 0.45)',
    backgroundColor: 'rgba(61, 220, 132, 0.1)',
  },
  cardElim: {
    borderColor: 'rgba(255, 90, 106, 0.35)',
  },
  cardOne: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(234, 170, 0, 0.12)',
  },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 40,
    lineHeight: 44,
    marginTop: 4,
    letterSpacing: 1,
  },
  valueLong: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: 8,
  },
  valueClinched: {
    color: colors.success,
  },
  valueElim: {
    color: colors.danger,
  },
  valueOne: {
    color: colors.gold,
  },
  caption: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 12,
    marginTop: 2,
  },
});

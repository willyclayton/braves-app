import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TeamLogo } from '@/components/TeamLogo';
import { colors, spacing } from '@/constants/theme';
import { gameDayLabel } from '@/lib/dates';
import type { WrigleyPath, WrigleyScenario } from '@/lib/wrigleyPath';

function SeedChip({
  seed,
  abbr,
  mark,
}: {
  seed: number;
  abbr: string;
  mark: 'atl' | 'chc' | null;
}) {
  return (
    <View style={[styles.seed, mark === 'atl' && styles.seedAtl, mark === 'chc' && styles.seedChc]}>
      <Text style={styles.seedNum}>{seed}</Text>
      <TeamLogo abbr={abbr} size={16} />
      <Text style={[styles.seedAbbr, mark && styles.seedAbbrHot]}>{abbr}</Text>
    </View>
  );
}

function AltRow({ scenario }: { scenario: WrigleyScenario }) {
  return (
    <View style={styles.alt}>
      <Text style={styles.altKicker}>{scenario.kicker}</Text>
      <Text style={styles.altHead}>{scenario.headline}</Text>
      <Text style={styles.altBody}>{scenario.body}</Text>
    </View>
  );
}

export function WrigleyIf({ path }: { path: WrigleyPath }) {
  const featured = path.scenarios.find((s) => s.featured) ?? path.scenarios[0];
  const alts = path.scenarios.filter((s) => s !== featured);
  if (!featured) return null;

  const nextAtWrigley = path.remainingRegular[0];
  const seedLabel = path.seeds.map((s) => `${s.seed} ${s.team.abbr}`).join(', ');

  return (
    <Link href="/standings" asChild>
      <Pressable
        style={styles.wrap}
        accessibilityRole="button"
        accessibilityLabel={`Braves play in Wrigley if. ${featured.kicker}. ${featured.headline}. ${featured.body} Seeds ${seedLabel}. Open standings.`}
      >
        <Text style={styles.sectionKicker}>BRAVES PLAY IN WRIGLEY IF…</Text>
        {nextAtWrigley ? (
          <Text style={styles.tonight}>
            {gameDayLabel(nextAtWrigley.date)} · {nextAtWrigley.time} at Wrigley. Then October:
          </Text>
        ) : null}

        <View style={[styles.card, featured.atWrigley ? styles.cardWrigley : styles.cardTruist]}>
          <Text style={styles.kicker}>{featured.kicker}</Text>
          <Text style={styles.headline}>{featured.headline}</Text>
          <Text style={styles.body}>{featured.body}</Text>
          <View style={styles.seeds}>
            {path.seeds.map((s) => (
              <SeedChip
                key={s.seed}
                seed={s.seed}
                abbr={s.team.abbr}
                mark={s.team.abbr === 'ATL' ? 'atl' : s.team.abbr === 'CHC' ? 'chc' : null}
              />
            ))}
          </View>
        </View>

        {alts.map((scenario) => (
          <AltRow key={scenario.id} scenario={scenario} />
        ))}
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
  tonight: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.navyLift,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  cardWrigley: {
    borderColor: 'rgba(234, 170, 0, 0.45)',
    backgroundColor: 'rgba(234, 170, 0, 0.1)',
  },
  cardTruist: {
    borderColor: 'rgba(206, 17, 65, 0.4)',
  },
  kicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
    lineHeight: 30,
    marginTop: 6,
    letterSpacing: 0.6,
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  seeds: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  seed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11, 20, 38, 0.45)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  seedAtl: {
    backgroundColor: 'rgba(206, 17, 65, 0.28)',
  },
  seedChc: {
    backgroundColor: 'rgba(14, 51, 134, 0.55)',
  },
  seedNum: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
  },
  seedAbbr: {
    fontFamily: 'DMSans_700Bold',
    color: colors.mist,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  seedAbbrHot: {
    color: colors.white,
  },
  alt: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  altKicker: {
    fontFamily: 'DMSans_700Bold',
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  altHead: {
    fontFamily: 'DMSans_700Bold',
    color: colors.cream,
    fontSize: 14,
    marginTop: 3,
  },
  altBody: {
    fontFamily: 'DMSans_400Regular',
    color: colors.mist,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
});

import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Props = {
  title: string;
  href?: '/lineup' | '/standings' | '/schedule' | '/';
  action?: string;
};

export function SectionHeader({ title, href, action = 'See all' }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {href ? (
        <Link href={href} asChild>
          <Pressable hitSlop={12}>
            <Text style={styles.action}>{action}</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 28,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    color: colors.white,
    fontSize: 26,
    letterSpacing: 1,
  },
  action: {
    fontFamily: 'DMSans_500Medium',
    color: colors.scarletSoft,
    fontSize: 13,
  },
});

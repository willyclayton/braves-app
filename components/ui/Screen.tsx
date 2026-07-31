import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
  padded?: boolean;
}>;

export function Screen({ children, scroll = true, contentStyle, padded = true }: Props) {
  const { pagePad, contentBottom } = usePhoneLayout();

  const padStyle = padded
    ? { paddingHorizontal: pagePad, paddingBottom: contentBottom }
    : { paddingBottom: contentBottom };

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces
      contentContainerStyle={[styles.content, padStyle, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, padStyle, contentStyle]}>{children}</View>
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {body}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  safe: {
    flex: 1,
  },
  content: {
    paddingTop: 4,
  },
  fill: {
    flex: 1,
  },
});

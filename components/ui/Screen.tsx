import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type Props = PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
}>;

export function Screen({ children, scroll = true, contentStyle }: Props) {
  const { pagePad, contentBottom } = usePhoneLayout();

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      bounces
      contentContainerStyle={[
        styles.content,
        { paddingHorizontal: pagePad, paddingBottom: contentBottom },
        contentStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.content,
        styles.fill,
        { paddingHorizontal: pagePad, paddingBottom: contentBottom },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A3358', colors.navy, '#070D18']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowScarlet} pointerEvents="none" />
      <View style={styles.glowGold} pointerEvents="none" />
      <View style={styles.stadiumLines} pointerEvents="none" />
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
    paddingTop: 8,
  },
  fill: {
    flex: 1,
  },
  glowScarlet: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(206, 17, 65, 0.28)',
  },
  glowGold: {
    position: 'absolute',
    top: 220,
    left: -110,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: 'rgba(234, 170, 0, 0.1)',
  },
  stadiumLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    opacity: 0.08,
    borderBottomWidth: 1,
    borderBottomColor: colors.gold,
  },
});

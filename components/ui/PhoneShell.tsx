import { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '@/constants/theme';

/** On wide screens, pin the experience to an iPhone-sized column. */
export function PhoneShell({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const constrain = Platform.OS === 'web' && width > 480;

  if (!constrain) {
    return <View style={styles.fill}>{children}</View>;
  }

  return (
    <View style={styles.desktop}>
      <View style={styles.phone}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  desktop: {
    flex: 1,
    backgroundColor: '#050910',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    maxHeight: 932,
    borderRadius: 36,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: colors.navy,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 18 },
  },
});

import { useWindowDimensions } from 'react-native';

/** Layout tokens tuned for SE → Pro Max. */
export function usePhoneLayout() {
  const { width, height } = useWindowDimensions();
  const compact = width < 390;
  const short = height < 740;

  return {
    width,
    height,
    compact,
    short,
    pagePad: compact ? 16 : 24,
    brandScale: compact ? 0.86 : 1,
    heroTitle: compact ? 40 : short ? 44 : 48,
    screenTitle: compact ? 44 : 52,
    matchup: compact ? 44 : 54,
    tabBottom: short ? 12 : 20,
    contentBottom: short ? 108 : 126,
  };
}

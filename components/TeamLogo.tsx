import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

/** ESPN CDN team marks — covers all 30 clubs. */
const ESPN_FIX: Record<string, string> = {
  ATH: 'ath',
  AZ: 'ari',
  ARI: 'ari',
  CHW: 'chw',
  CWS: 'chw',
  KCR: 'kc',
  KC: 'kc',
  SDP: 'sd',
  SD: 'sd',
  SFG: 'sf',
  SF: 'sf',
  TBR: 'tb',
  TB: 'tb',
  WSN: 'wsh',
  WSH: 'wsh',
};

function espnSlug(abbr: string) {
  const upper = abbr.toUpperCase();
  return ESPN_FIX[upper] || upper.toLowerCase();
}

type Props = {
  abbr: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function TeamLogo({ abbr, size = 36, style, imageStyle }: Props) {
  const uri = `https://a.espncdn.com/i/teamlogos/mlb/500/${espnSlug(abbr)}.png`;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri }}
        style={[styles.img, { width: size, height: size }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel={`${abbr} logo`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  img: {
    width: '100%',
    height: '100%',
  },
});

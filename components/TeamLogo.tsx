import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { teamLogo } from '@/constants/logos';

type Props = {
  abbr: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function TeamLogo({ abbr, size = 36, style, imageStyle }: Props) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={teamLogo(abbr)}
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

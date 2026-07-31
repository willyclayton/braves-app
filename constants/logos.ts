import { ImageSourcePropType } from 'react-native';

const logos: Record<string, ImageSourcePropType> = {
  ATL: require('../assets/images/atl.png'),
  WSH: require('../assets/images/wsh.png'),
  NYM: require('../assets/images/nym.png'),
  MIA: require('../assets/images/mia.png'),
  PHI: require('../assets/images/phi.png'),
  NYY: require('../assets/images/nyy.png'),
};

export function teamLogo(abbr: string): ImageSourcePropType {
  return logos[abbr.toUpperCase()] ?? logos.ATL;
}

export const bravesLogo = logos.ATL;

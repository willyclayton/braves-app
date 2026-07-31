import {
  ArchivoBlack_400Regular,
  useFonts as useArchivo,
} from '@expo-google-fonts/archivo-black';
import {
  BebasNeue_400Regular,
  useFonts as useBebas,
} from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  useFonts as useDMSans,
} from '@expo-google-fonts/dm-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneShell } from '@/components/ui/PhoneShell';
import { colors } from '@/constants/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [bebasLoaded] = useBebas({ BebasNeue_400Regular });
  const [dmLoaded] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  const [archivoLoaded] = useArchivo({ ArchivoBlack_400Regular });

  const loaded = bebasLoaded && dmLoaded && archivoLoaded;

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.navy }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <PhoneShell>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.navy },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="game/[pk]"
              options={{
                headerShown: true,
                animation: 'slide_from_right',
              }}
            />
            <Stack.Screen
              name="player/[id]"
              options={{
                headerShown: true,
                animation: 'slide_from_right',
              }}
            />
          </Stack>
        </PhoneShell>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

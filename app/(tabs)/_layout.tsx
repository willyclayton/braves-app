import { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { usePhoneLayout } from '@/hooks/usePhoneLayout';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IconName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { tabBottom, compact } = usePhoneLayout();
  const bottomGap = Math.max(insets.bottom, tabBottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mistDim,
        tabBarStyle: [
          styles.tabBar,
          {
            left: compact ? 12 : 16,
            right: compact ? 12 : 16,
            bottom: bottomGap,
            height: compact ? 62 : 68,
          },
        ],
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => <View style={styles.tabBg} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="lineup"
        options={{
          title: 'Lineup',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'podium' : 'podium-outline'} color={String(color)} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} color={String(color)} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderRadius: 24,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: 6,
    paddingBottom: 6,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(18px)',
      },
      default: {},
    }),
  },
  tabBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 20, 38, 0.94)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tabLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 10,
    marginTop: 1,
  },
  tabItem: {
    minHeight: 48,
  },
});

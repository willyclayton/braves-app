import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

function TabIcon({
  ios,
  android,
  web,
  color,
}: {
  ios: string;
  android: string;
  web: string;
  color: string;
}) {
  return (
    <SymbolView
      name={{ ios: ios as any, android: android as any, web: web as any }}
      tintColor={color}
      size={24}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.mistDim,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <View style={styles.tabBg} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="house.fill"
              android="home"
              web="home"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="lineup"
        options={{
          title: 'Lineup',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="person.3.fill"
              android="group"
              web="group"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="list.number"
              android="leaderboard"
              web="leaderboard"
              color={String(color)}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => (
            <TabIcon
              ios="calendar"
              android="calendar_month"
              web="calendar_month"
              color={String(color)}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.select({ ios: 24, default: 16 }),
    height: 68,
    borderRadius: 24,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    paddingTop: 8,
    paddingBottom: 8,
  },
  tabBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 20, 38, 0.92)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tabLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    marginTop: 2,
  },
});

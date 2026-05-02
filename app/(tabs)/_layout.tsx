import { Tabs } from 'expo-router';
import { AppIcon } from '@/src/components/AppIcon';
import { fontFamily } from '@/src/theme/typography';
import { t } from '@/src/i18n';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#f9faf7' },
        lazy: false,
        tabBarActiveTintColor: '#065f46',
        tabBarInactiveTintColor: '#a1a1aa',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.05)',
          backgroundColor: '#ffffff',
          height: 86,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.mono,
          fontSize: 10,
          letterSpacing: 1.8,
          lineHeight: 12,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) => <AppIcon name="home" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('nav.library').toUpperCase(),
          tabBarIcon: ({ color }) => <AppIcon name="bookmarks" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#FF6B6B',
      tabBarInactiveTintColor: '#9E9E9E',
      headerShown: false,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="progress" options={{ title: 'İlerleme', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="focus" options={{ title: 'Odak', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⏱️</Text> }} />
    </Tabs>
  );
}
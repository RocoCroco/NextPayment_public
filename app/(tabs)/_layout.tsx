// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/src/constants/Colors';
import { useColorScheme } from '@/src/hooks/useColorScheme';
import { View } from 'react-native';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size?: number;
}) {
  return <Ionicons size={props.size || 24} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarShowLabel: false, // ✨ Sin texto debajo de iconos
        tabBarStyle: {
          // ✨ Estilo flotante corregido
          position: 'absolute',
          bottom: 25,
          marginHorizontal: 20, // ✨ Esto sí funciona para separar de laterales
          height: 60,
          backgroundColor: theme.card,
          borderRadius: 20,
          borderTopWidth: 0,
          
          // ✨ Sombra muy sutil
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          
          // Elevation para Android
          elevation: 5,
          
          // Padding interno
          paddingBottom: 5,
          paddingTop: 5,
          paddingHorizontal: 15,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon 
              name={focused ? 'wallet' : 'wallet-outline'} 
              color={color} // ✨ Solo cambia de color, nada más
              size={24}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="calendar"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon 
              name={focused ? 'calendar' : 'calendar-outline'} 
              color={color} // ✨ Solo cambia de color
              size={24}
            />
          ),
        }}
      />
      
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon 
              name={focused ? 'stats-chart' : 'stats-chart-outline'} 
              color={color} // ✨ Solo cambia de color
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
// app/_layout.tsx
import { useSubscriptionStore } from '@/src/stores/subscriptionStore';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text } from 'react-native';
import '@/src/i18n';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const rebuildAllNotifications = useSubscriptionStore((state) => state.rebuildAllNotifications);

  let [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const rebuild = async () => {
      const start = Date.now();
      await rebuildAllNotifications();
      const end = Date.now();
      console.log(`⏱ Rebuild completado en ${(end - start) / 1000} segundos`);
    };

    rebuild();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // 🐛 Debug: Añade esto temporalmente
  console.log('Fonts loaded:', fontsLoaded);
  console.log('Font error:', fontError);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // 🐛 Debug: Añade esto temporalmente
  if (fontError) {
    console.error('Font loading error:', fontError);
    return (
      <Text style={{ padding: 50, fontSize: 16 }}>
        Error loading fonts: {fontError.message}
      </Text>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="payment" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}
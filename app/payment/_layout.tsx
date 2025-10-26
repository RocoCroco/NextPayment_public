// app/payment/_layout.tsx
import { Stack } from 'expo-router';

export default function PaymentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="add" />
      <Stack.Screen name="detail/[id]" />
      <Stack.Screen name="edit/[id]" />
    </Stack>
  );
}
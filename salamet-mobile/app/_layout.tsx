import { Stack, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const segments = useSegments();

  useEffect(() => {
    console.log('🛡️ [RootLayout] Segments:', segments);
  }, [segments]);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}

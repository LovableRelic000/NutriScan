// Layout raíz de Expo Router con inicialización de Auth, Notificaciones y Navegación Stack

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { NotificationService } from '@/services/notifications/notificationService';
import { useThemeStore, useTheme } from '@/core/themeStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isDark } = useTheme();
  const { initAuthListener, isInitializing } = useAuthStore();

  useEffect(() => {
    // 0. Cargar tema persistido
    useThemeStore.getState().loadTheme();

    // 1. Inicializar listener de Firebase Auth
    const unsubscribeAuth = initAuthListener();

    // 2. Inicializar canales y permisos de notificaciones locales
    NotificationService.setup().catch((e) => console.warn('Error setup notificaciones:', e));

    return () => {
      unsubscribeAuth();
    };
  }, [initAuthListener]);

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isInitializing]);

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="manual-ocr" options={{ headerShown: false }} />
        <Stack.Screen name="scan-result" options={{ headerShown: false }} />
        <Stack.Screen
          name="subscription"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="developer-tools"
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

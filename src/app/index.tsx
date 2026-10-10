// Pantalla de Entrada y Redirección Inteligente

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { lightColors as colors, spacing } from '@/core/theme';
import { useAuthStore } from '@/features/auth/useAuthStore';

export default function IndexScreen() {
  const { user, userDoc, isInitializing } = useAuthStore();

  useEffect(() => {
    if (!isInitializing) {
      if (!user) {
        // No hay cuenta activa -> ir a la pantalla de Auth (Crear Cuenta / Login / Invitado)
        router.replace('/auth');
        return;
      }

      // Si el perfil de salud aún no está configurado (primer uso)
      const hasHealthProfile =
        userDoc?.health_profile?.allergies?.length ||
        userDoc?.health_profile?.lifestyles?.length ||
        userDoc?.health_profile?.custom_avoid?.length;

      if (!hasHealthProfile) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [isInitializing, user, userDoc]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🥗</Text>
      <Text style={styles.title}>NutriScan AI</Text>
      <Text style={styles.subtitle}>Tu asistente inteligente de seguridad alimentaria</Text>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  logo: {
    fontSize: 72,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

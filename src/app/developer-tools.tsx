// Pantalla Oculta de Herramientas de Desarrollador / Demo
// Activada mediante pulsación larga (long-press) sobre el logo en Home

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightColors as colors, spacing, borderRadius } from '@/core/theme';
import { NotificationService } from '@/services/notifications/notificationService';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { isMlKitAvailable, isExpoGo } from '@/services/ocr/ocrService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function DeveloperToolsScreen() {
  const { user, userDoc, isPro, setProStatus } = useAuthStore();
  const [testNotificationScheduled, setTestNotificationScheduled] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(0);

  const handleTestNotification = async () => {
    try {
      await NotificationService.triggerTestNotification();
      setTestNotificationScheduled(true);
      setCountdown(10);

      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setTestNotificationScheduled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      Alert.alert(
        'Notificación Programada',
        'Se ha enviado una notificación local para dispararse en 10 segundos. Puedes minimizar la app o dejarla abierta.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo programar la notificación.');
    }
  };

  const toggleProDirectly = async () => {
    try {
      await setProStatus(!isPro);
      Alert.alert('Estado Pro Actualizado', `is_pro ahora es: ${!isPro}`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver al Inicio</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🛠️ Panel de Desarrollador</Text>
          <Text style={styles.subtitle}>
            Herramientas de depuración y utilidades de demostración para el Samsung Galaxy S25 Ultra.
          </Text>
        </View>

        {/* Sección: Notificaciones de Demostración */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🔔 Prueba de Notificaciones Locales</Text>
          <Text style={styles.cardDesc}>
            Dispara una notificación local con retraso de 10 segundos para verificar permisos y canales de Android.
          </Text>
          <Button
            title={testNotificationScheduled ? `Disparando en ${countdown}s...` : 'Notificación de prueba en 10 s'}
            variant="primary"
            disabled={testNotificationScheduled}
            onPress={handleTestNotification}
          />
        </Card>

        {/* Sección: Estado de Entorno */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📱 Diagnóstico del Entorno</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Entorno de Ejecución:</Text>
            <Text style={styles.val}>{isExpoGo() ? 'Expo Go' : 'Development Build / Standalone'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Módulo ML Kit Nativo:</Text>
            <Text style={[styles.val, { color: isMlKitAvailable() ? colors.safe : colors.caution }]}>
              {isMlKitAvailable() ? '✓ Disponible' : '✕ No compilado (Fallback Manual)'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Usuario UID:</Text>
            <Text style={styles.val} numberOfLines={1}>{user?.uid || 'Sin sesión'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo de Cuenta:</Text>
            <Text style={styles.val}>{user?.isAnonymous ? 'Anónimo (Invitado)' : 'Email Registrado'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Suscripción Nutri-AI Pro:</Text>
            <Text style={[styles.val, { color: isPro ? colors.accent : colors.textSecondary }]}>
              {isPro ? '⭐ ACTIVO' : 'Plan Gratuito'}
            </Text>
          </View>
        </Card>

        {/* Sección: Controles de Demostración Rápida */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>⚡ Atajos de Demostración</Text>
          <Button
            title={isPro ? 'Desactivar Pro temporalmente' : 'Activar Pro instantáneamente'}
            variant="outline"
            onPress={toggleProDirectly}
            style={{ marginBottom: spacing.sm }}
          />
          <Button
            title="Abrir Pantalla de OCR Manual"
            variant="secondary"
            onPress={() => router.push('/manual-ocr')}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  val: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
});

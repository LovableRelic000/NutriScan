// Pantalla Principal (Home): Anillos de Hidratación y Pasos, Acciones y Crononutrición

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LightSensor } from 'expo-sensors';
import { borderRadius, shadows, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { useWaterTracker } from '@/services/hydration/useWaterTracker';
import { useStepsTracker } from '@/services/steps/useStepsTracker';
import { NotificationService } from '@/services/notifications/notificationService';
import { getTodayDateString } from '@/core/utils';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');
const RING_SIZE = (width - spacing.md * 3) / 2;

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const { userDoc, isPro } = useAuthStore();
  const { totalMl, goalMl, percentage: waterPct, addWater, undoLast, actionLoading, entriesCount } = useWaterTracker();
  const { steps, goal: stepsGoal } = useStepsTracker();
  const [ambientLux, setAmbientLux] = useState<number | null>(null);

  const [showChronoBanner, setShowChronoBanner] = useState<boolean>(false);

  // Sensor de luz ambiente pasivo para crononutrición (sin encender flash)
  useEffect(() => {
    let sub: any = null;
    async function initSensor() {
      if (Platform.OS === 'android') {
        try {
          const avail = await LightSensor.isAvailableAsync();
          if (avail) {
            sub = LightSensor.addListener((data) => setAmbientLux(data.illuminance));
          }
        } catch {}
      }
    }
    initSensor();
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  // Evaluar aviso de Crononutrición nocturna
  useEffect(() => {
    async function checkChrononutrition() {
      const now = new Date();
      const hour = now.getHours();
      const today = getTodayDateString();

      // Regla: hora >= 21:00 Y lux < 40 con la app abierta
      if (hour >= 21 && ambientLux !== null && ambientLux < 40) {
        const flagKey = `crononutrition:${today}`;
        const alreadyShown = await AsyncStorage.getItem(flagKey);
        if (!alreadyShown) {
          setShowChronoBanner(true);
          await AsyncStorage.setItem(flagKey, 'true');
        }
      }
    }

    checkChrononutrition();
  }, [ambientLux]);

  // Programar recordatorios de agua distribuidos a lo largo del día según la meta
  useEffect(() => {
    const dailyWaterMl = userDoc?.goals?.daily_water_ml || 2000;
    const waterEnabled = userDoc?.settings?.water_reminders?.enabled ?? true;
    NotificationService.scheduleWaterReminders(dailyWaterMl, waterEnabled);
  }, [userDoc?.goals?.daily_water_ml, userDoc?.settings?.water_reminders?.enabled]);

  // Actualizar alerta de inactividad basada en pasos
  useEffect(() => {
    if (userDoc?.settings?.inactivity_alert !== undefined) {
      NotificationService.updateInactivityAlert(
        steps,
        stepsGoal,
        userDoc.settings.inactivity_alert
      );
    }
  }, [steps, stepsGoal, userDoc?.settings?.inactivity_alert]);

  const handleAddWater = (ml: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addWater(ml);
  };

  const handleUndoWater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await undoLast();
    if (!success) {
      Alert.alert('Aviso', 'No hay registros de agua para deshacer hoy.');
    }
  };

  const handleLogoLongPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push('/developer-tools');
  };

  const stepsPct = Math.min(100, Math.round((steps / stepsGoal) * 100));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera con pulsación larga sobre el logo */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <TouchableOpacity onLongPress={handleLogoLongPress} delayLongPress={800} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="leaf" size={24} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.brandTitle, { color: colors.primary }]}>NutriScan AI</Text>
            </TouchableOpacity>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]} numberOfLines={1}>
              ¡Hola, {userDoc?.display_name || 'Bienvenido'}!
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.proBadge, { backgroundColor: isPro ? colors.accent : colors.surfaceVariant }]}
            onPress={() => router.push('/subscription')}
          >
            <MaterialCommunityIcons
              name={isPro ? 'star' : 'lightning-bolt'}
              size={14}
              color={isPro ? '#FFF' : colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.proBadgeText, { color: isPro ? '#FFF' : colors.textSecondary }]}>
              {isPro ? 'PRO' : 'PLAN FREE'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alerta Discreta de Crononutrición */}
        {showChronoBanner && (
          <Card style={styles.chronoBanner}>
            <View style={styles.chronoRow}>
              <MaterialCommunityIcons name="weather-night" size={28} color="#FFD166" style={{ marginRight: spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.chronoTitle}>Consejo de Crononutrición</Text>
                <Text style={styles.chronoText}>
                  Es de noche y la luz ambiental es baja. Procura evitar comidas copiosas o ultraprocesadas para favorecer un descanso digestivo óptimo.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowChronoBanner(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Anillos de Progreso: Hidratación y Pasos */}
        <Text style={styles.sectionTitle}>Hábitos de Hoy</Text>
        <View style={styles.ringsRow}>
          {/* Anillo de Agua */}
          <Card style={[styles.ringCard, { width: RING_SIZE }]}>
            <ProgressRing
              size={RING_SIZE - 28}
              strokeWidth={10}
              progress={waterPct}
              color={colors.water}
              vectorIcon="water"
              valueText={`${totalMl}`}
              unitText={`de ${goalMl} ml`}
              labelText={`${waterPct}% meta`}
            />

            <View style={styles.waterControls}>
              <View style={styles.waterButtonsRow}>
                <TouchableOpacity
                  style={styles.waterBtn}
                  onPress={() => handleAddWater(250)}
                  disabled={actionLoading}
                >
                  <Text style={styles.waterBtnText}>+250 ml</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.waterBtn}
                  onPress={() => handleAddWater(500)}
                  disabled={actionLoading}
                >
                  <Text style={styles.waterBtnText}>+500 ml</Text>
                </TouchableOpacity>
              </View>

              {entriesCount > 0 && (
                <TouchableOpacity
                  style={[styles.undoBtn, { flexDirection: 'row', alignItems: 'center' }]}
                  onPress={handleUndoWater}
                  disabled={actionLoading}
                >
                  <MaterialCommunityIcons name="undo" size={13} color={colors.textMuted} style={{ marginRight: 3 }} />
                  <Text style={styles.undoBtnText}>Deshacer último</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          {/* Anillo de Pasos */}
          <Card style={[styles.ringCard, { width: RING_SIZE }]}>
            <ProgressRing
              size={RING_SIZE - 28}
              strokeWidth={10}
              progress={stepsPct}
              color={colors.steps}
              vectorIcon="walk"
              valueText={`${steps.toLocaleString('es-MX')}`}
              unitText={`de ${stepsGoal.toLocaleString('es-MX')}`}
              labelText={`${stepsPct}% meta`}
            />

            <View style={styles.stepsInfoBox}>
              <Text style={styles.stepsSublabel}>Contador en vivo</Text>
              <Text style={styles.stepsHint}>Pedometer activo</Text>
            </View>
          </Card>
        </View>

        {/* Acceso Rápido al Escáner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/scanner')}
          style={styles.scannerHeroButton}
        >
          <View style={styles.scannerHeroContent}>
            <MaterialCommunityIcons name="barcode-scan" size={32} color="#FFF" style={{ marginRight: spacing.md }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scannerHeroTitle}>Escanear Etiqueta</Text>
              <Text style={styles.scannerHeroDesc}>
                Apunta con la cámara para verificar alérgenos e ingredientes al instante con Semáforo.
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Cuadrícula de Acciones Rápidas */}
        <Text style={styles.sectionTitle}>Funciones Principales</Text>
        <View style={styles.grid}>
          {/* Card: OCR Manual */}
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/manual-ocr')}
          >
            <Card style={styles.gridCard}>
              <MaterialCommunityIcons name="pencil-outline" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.gridTitle}>Texto Manual</Text>
              <Text style={styles.gridDesc}>Prueba o escribe etiquetas de productos</Text>
            </Card>
          </TouchableOpacity>

          {/* Card: Historial */}
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/history')}
          >
            <Card style={styles.gridCard}>
              <MaterialCommunityIcons name="clipboard-text-clock-outline" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.gridTitle}>Historial</Text>
              <Text style={styles.gridDesc}>Tus escaneos previos con semáforo</Text>
            </Card>
          </TouchableOpacity>

          {/* Card: Chat Nutri-AI */}
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <Card style={styles.gridCard}>
              <MaterialCommunityIcons name="robot-happy-outline" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.gridTitle}>Nutri-AI Chat</Text>
              <Text style={styles.gridDesc}>Orientación personalizada con IA</Text>
            </Card>
          </TouchableOpacity>

          {/* Card: Perfil */}
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Card style={styles.gridCard}>
              <MaterialCommunityIcons name="shield-account-outline" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.gridTitle}>Mi Perfil</Text>
              <Text style={styles.gridDesc}>Alergias, estilos de vida y metas</Text>
            </Card>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  greetingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    flexShrink: 0,
    alignSelf: 'flex-start',
    minWidth: 95,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chronoBanner: {
    backgroundColor: '#312E81',
    borderColor: '#4338CA',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  chronoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chronoIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  chronoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E0E7FF',
  },
  chronoText: {
    fontSize: 12,
    color: '#C7D2FE',
    lineHeight: 18,
    marginTop: 2,
  },
  closeChrono: {
    color: '#C7D2FE',
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  ringCard: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  waterControls: {
    width: '100%',
    marginTop: spacing.sm,
  },
  waterButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  waterBtn: {
    flex: 1,
    backgroundColor: colors.water + '15',
    borderColor: colors.water,
    borderWidth: 1,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  waterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.water,
  },
  undoBtn: {
    marginTop: 6,
    alignItems: 'center',
  },
  undoBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  stepsInfoBox: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  stepsSublabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  stepsHint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scannerHeroButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  scannerHeroContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerHeroIcon: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  scannerHeroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scannerHeroDesc: {
    fontSize: 13,
    color: '#E6F4FE',
    lineHeight: 18,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: spacing.sm,
  },
  gridCard: {
    padding: spacing.md,
    alignItems: 'flex-start',
    height: 120,
  },
  gridIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  gridDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
    marginTop: 2,
  },
});

// Pantalla de Perfil de Salud, Preferencias y Bloqueo Biométrico

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { BiometricsService } from '@/services/biometrics/biometricsService';
import {
  CANONICAL_ALLERGIES,
  ALLERGY_LABELS,
  CANONICAL_LIFESTYLES,
  LIFESTYLE_LABELS,
  CanonicalAllergy,
  CanonicalLifestyle,
} from '@/core/constants';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, userDoc, isPro, updateHealthProfile, updateGoals, updateSettings, linkWithEmailPassword, signOut } = useAuthStore();

  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
  const [authenticating, setAuthenticating] = useState<boolean>(false);

  // Estados locales editables
  const [selectedAllergies, setSelectedAllergies] = useState<CanonicalAllergy[]>([]);
  const [selectedLifestyles, setSelectedLifestyles] = useState<CanonicalLifestyle[]>([]);
  const [customAvoidList, setCustomAvoidList] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState<string>('');

  // Metas
  const [stepsGoal, setStepsGoal] = useState<number>(8000);
  const [waterGoal, setWaterGoal] = useState<number>(2000);

  // Ajustes
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState<boolean>(true);
  const [inactivityAlertEnabled, setInactivityAlertEnabled] = useState<boolean>(true);
  const [biometricLockEnabled, setBiometricLockEnabled] = useState<boolean>(false);

  // Modal para vincular email
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [linkLoading, setLinkLoading] = useState<boolean>(false);

  // Sincronizar datos iniciales desde Firestore
  useEffect(() => {
    if (userDoc) {
      setSelectedAllergies(userDoc.health_profile?.allergies || []);
      setSelectedLifestyles(userDoc.health_profile?.lifestyles || []);
      setCustomAvoidList(userDoc.health_profile?.custom_avoid || []);
      setStepsGoal(userDoc.goals?.daily_steps || 8000);
      setWaterGoal(userDoc.goals?.daily_water_ml || 2000);
      setWaterRemindersEnabled(userDoc.settings?.water_reminders?.enabled ?? true);
      setInactivityAlertEnabled(userDoc.settings?.inactivity_alert ?? true);
      setBiometricLockEnabled(userDoc.settings?.biometric_lock_profile ?? false);

      // Si el bloqueo biométrico está activo, bloquear hasta validar
      if (userDoc.settings?.biometric_lock_profile) {
        setIsUnlocked(false);
      }
    }
  }, [userDoc]);

  // Autenticar para desbloquear la vista de perfil
  const handleUnlockProfile = async () => {
    try {
      setAuthenticating(true);
      const res = await BiometricsService.authenticate(
        'Desbloquea para ver o modificar tu perfil de salud'
      );
      if (res.success) {
        setIsUnlocked(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Acceso Denegado', 'No se pudo verificar tu identidad.');
      }
    } finally {
      setAuthenticating(false);
    }
  };

  const toggleAllergy = (a: CanonicalAllergy) => {
    setSelectedAllergies((prev) =>
      prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]
    );
  };

  const toggleLifestyle = (l: CanonicalLifestyle) => {
    setSelectedLifestyles((prev) =>
      prev.includes(l) ? prev.filter((item) => item !== l) : [...prev, l]
    );
  };

  const addCustomAvoid = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (customAvoidList.includes(trimmed)) return;
    setCustomAvoidList((prev) => [...prev, trimmed]);
    setCustomInput('');
  };

  const removeCustomAvoid = (idx: number) => {
    setCustomAvoidList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProfile = async () => {
    try {
      await updateHealthProfile({
        allergies: selectedAllergies,
        lifestyles: selectedLifestyles,
        custom_avoid: customAvoidList,
      });

      await updateGoals({
        daily_steps: stepsGoal,
        daily_water_ml: waterGoal,
      });

      await updateSettings({
        biometric_lock_profile: biometricLockEnabled,
        inactivity_alert: inactivityAlertEnabled,
        water_reminders: {
          enabled: waterRemindersEnabled,
          start_hour: 8,
          end_hour: 22,
          interval_min: 120,
        },
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Éxito', 'Tu perfil y configuración han sido guardados correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudieron guardar los cambios.');
    }
  };

  const handleLinkAccount = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      Alert.alert('Datos incompletos', 'Ingresa un correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    try {
      setLinkLoading(true);
      await linkWithEmailPassword(emailInput.trim(), passwordInput);
      setShowLinkModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Cuenta Vinculada', 'Tu sesión ahora cuenta con credenciales permanentes de email/contraseña.');
    } catch (e: any) {
      Alert.alert('Error al vincular', e.message);
    } finally {
      setLinkLoading(false);
    }
  };

  // Si la pantalla está bloqueada por compuerta biométrica
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.lockedContainer}>
          <MaterialCommunityIcons
            name="shield-lock-outline"
            size={64}
            color={colors.primary}
            style={{ marginBottom: spacing.md }}
          />
          <Text style={styles.lockedTitle}>Perfil Protegido por Biometría</Text>
          <Text style={styles.lockedDesc}>
            Has activado la compuerta de seguridad para proteger tus datos de salud y alérgenos de miradas curiosas.
          </Text>
          <Button
            title="Desbloquear Perfil"
            loading={authenticating}
            onPress={handleUnlockProfile}
            style={{ width: '80%', marginTop: spacing.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Mi Perfil de Salud</Text>
          <Text style={styles.subtitle}>
            Alergias, metas de bienestar y opciones de privacidad.
          </Text>
        </View>

        {/* Tarjeta de Usuario */}
        <Card style={styles.userCard}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userDoc?.display_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.userName}>{userDoc?.display_name || 'Usuario'}</Text>
              <Text style={styles.userEmail}>
                {user?.isAnonymous ? 'Sesión de Invitado (Anónimo)' : user?.email}
              </Text>
              <View style={[styles.proBadge, { backgroundColor: isPro ? colors.accent : colors.surfaceVariant, flexDirection: 'row', alignItems: 'center' }]}>
                <MaterialCommunityIcons
                  name={isPro ? 'star' : 'star-outline'}
                  size={12}
                  color={isPro ? '#FFF' : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.proBadgeText, { color: isPro ? '#FFF' : colors.textSecondary }]}>
                  {isPro ? 'Nutri-AI Pro Activo' : 'Plan Free Básico'}
                </Text>
              </View>
            </View>
          </View>

          {user?.isAnonymous && (
            <Button
              title="Vincular Correo / Contraseña"
              variant="outline"
              size="sm"
              onPress={() => setShowLinkModal(true)}
              style={{ marginTop: spacing.md }}
            />
          )}
        </Card>

        {/* Alergias declaradas */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Alergias e Intolerancias (Peligro):</Text>
          <Text style={styles.sectionHint}>
            Los productos que contengan estos ingredientes dispararán la alerta ROJA (DANGER).
          </Text>
          <View style={styles.chipsWrap}>
            {CANONICAL_ALLERGIES.map((allergy) => (
              <Chip
                key={allergy}
                label={ALLERGY_LABELS[allergy]?.name || allergy}
                vectorIcon={ALLERGY_LABELS[allergy]?.vectorIcon}
                selected={selectedAllergies.includes(allergy)}
                onPress={() => toggleAllergy(allergy)}
              />
            ))}
          </View>
        </Card>

        {/* Estilos de vida */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Estilos de Vida y Condiciones (Precaución):</Text>
          <Text style={styles.sectionHint}>
            Dispararán alertas AMBAR (CAUTION) para advertirte sobre ingredientes contrarios a tu dieta.
          </Text>
          <View style={styles.chipsWrap}>
            {CANONICAL_LIFESTYLES.map((lifestyle) => (
              <Chip
                key={lifestyle}
                label={LIFESTYLE_LABELS[lifestyle]?.name || lifestyle}
                vectorIcon={LIFESTYLE_LABELS[lifestyle]?.vectorIcon}
                selected={selectedLifestyles.includes(lifestyle)}
                onPress={() => toggleLifestyle(lifestyle)}
              />
            ))}
          </View>
        </Card>

        {/* Ingredientes personalizados a evitar */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ingredientes que evitas (Personalizados):</Text>
          <View style={styles.customRow}>
            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Ej. Tartrazina, Maltitol"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { flex: 1 }]}
              onSubmitEditing={addCustomAvoid}
            />
            <Button
              title="Añadir"
              size="sm"
              onPress={addCustomAvoid}
              style={{ marginLeft: spacing.sm }}
            />
          </View>
          <View style={styles.chipsWrap}>
            {customAvoidList.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.customTag}
                onPress={() => removeCustomAvoid(idx)}
              >
                <Text style={styles.customTagText}>{item} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Metas diarias */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Metas de Hábitos Diarios:</Text>
          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Meta de Pasos:</Text>
            <View style={styles.goalControls}>
              <TouchableOpacity
                style={styles.miniBtn}
                onPress={() => setStepsGoal((s) => Math.max(2000, s - 1000))}
              >
                <Text style={styles.miniBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.goalNum}>{stepsGoal.toLocaleString('es-MX')}</Text>
              <TouchableOpacity
                style={styles.miniBtn}
                onPress={() => setStepsGoal((s) => Math.min(30000, s + 1000))}
              >
                <Text style={styles.miniBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.goalRow}>
            <Text style={styles.goalLabel}>Meta de Agua (ml):</Text>
            <View style={styles.goalControls}>
              <TouchableOpacity
                style={styles.miniBtn}
                onPress={() => setWaterGoal((w) => Math.max(1000, w - 250))}
              >
                <Text style={styles.miniBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.goalNum}>{waterGoal} ml</Text>
              <TouchableOpacity
                style={styles.miniBtn}
                onPress={() => setWaterGoal((w) => Math.min(5000, w + 250))}
              >
                <Text style={styles.miniBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Apariencia / Modo Oscuro */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Apariencia:</Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons
                name={isDark ? 'weather-night' : 'weather-sunny'}
                size={24}
                color={isDark ? colors.accent : colors.primary}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Modo Oscuro</Text>
                <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>
                  {isDark ? 'Tema oscuro activo (#0B1120)' : 'Tema claro activo'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={isDark ? '#FFF' : '#FFF'}
            />
          </View>
        </Card>

        {/* Notificaciones y Privacidad */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ajustes y Seguridad:</Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Recordatorios de Agua</Text>
              <Text style={styles.switchDesc}>Avisos locales durante el día (8:00 a 22:00 hrs)</Text>
            </View>
            <Switch
              value={waterRemindersEnabled}
              onValueChange={setWaterRemindersEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={waterRemindersEnabled ? colors.primary : '#FFF'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Alerta de Inactividad Diaria</Text>
              <Text style={styles.switchDesc}>Recordatorio a las 18:00 si falta actividad</Text>
            </View>
            <Switch
              value={inactivityAlertEnabled}
              onValueChange={setInactivityAlertEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={inactivityAlertEnabled ? colors.primary : '#FFF'}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Bloqueo Biométrico de Perfil</Text>
              <Text style={styles.switchDesc}>Exige huella o PIN para ver o editar tu perfil</Text>
            </View>
            <Switch
              value={biometricLockEnabled}
              onValueChange={setBiometricLockEnabled}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={biometricLockEnabled ? colors.primary : '#FFF'}
            />
          </View>
        </Card>

        {/* Botón Guardar Cambios */}
        <Button
          title="Guardar Cambios"
          size="lg"
          onPress={handleSaveProfile}
          style={{ marginVertical: spacing.md }}
        />

        {/* Botón Cerrar Sesión */}
        <Button
          title="Cerrar Sesión"
          variant="outline"
          size="md"
          onPress={() => {
            Alert.alert(
              'Cerrar Sesión',
              '¿Estás seguro de que deseas cerrar tu sesión actual?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Cerrar Sesión',
                  style: 'destructive',
                  onPress: async () => {
                    await signOut();
                    router.replace('/auth');
                  },
                },
              ]
            );
          }}
          style={{ marginBottom: spacing.lg, borderColor: colors.border }}
        />

        {/* Modal para vincular cuenta anónima */}
        {showLinkModal && (
          <Card style={styles.linkModalCard}>
            <Text style={styles.sectionTitle}>Vincular Email y Contraseña</Text>
            <Text style={styles.sectionHint}>
              Conserva todos tus datos e historial creando un acceso con credenciales.
            </Text>
            <TextInput
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="tu_correo@ejemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { marginVertical: spacing.xs }]}
            />
            <TextInput
              value={passwordInput}
              onChangeText={setPasswordInput}
              placeholder="Contraseña (mínimo 6 caracteres)"
              secureTextEntry
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { marginBottom: spacing.md }]}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                title="Cancelar"
                variant="outline"
                size="md"
                onPress={() => setShowLinkModal(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Vincular Cuenta"
                size="md"
                loading={linkLoading}
                onPress={handleLinkAccount}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        )}
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  lockedIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  lockedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  lockedDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  customTag: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  customTagText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  goalLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  goalControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  goalNum: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginHorizontal: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  switchDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  linkModalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
});

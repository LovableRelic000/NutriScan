// Pantalla de Autenticación Principal (Crear Cuenta / Iniciar Sesión / Modo Invitado)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { lightColors as colors, spacing, borderRadius, shadows } from '@/core/theme';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, ensureAnonymousAuth, isLoading } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();

    if (!trimmedEmail || !trimmedPass) {
      Alert.alert('Campos Incompletos', 'Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    if (mode === 'register' && !displayName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre o apodo.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (mode === 'register') {
        await signUpWithEmail(trimmedEmail, trimmedPass, displayName.trim());
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/onboarding');
      } else {
        await signInWithEmail(trimmedEmail, trimmedPass);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      let errorMsg = 'No se pudo completar la operación.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'Este correo ya tiene una cuenta registrada. Intenta Iniciar Sesión.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'Correo electrónico o contraseña incorrectos.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      Alert.alert('Error de Autenticación', errorMsg);
    }
  };

  const handleGuestLogin = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await ensureAnonymousAuth();
      router.replace('/onboarding');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo iniciar como invitado.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo y Encabezado */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <MaterialCommunityIcons name="shield-check" size={44} color={colors.primary} />
            </View>
            <Text style={styles.appName}>NutriScan AI</Text>
            <Text style={styles.appTagline}>
              Seguridad alimentaria inteligente y hábitos saludables
            </Text>
          </View>

          {/* Selector de Pestañas (Registro / Login) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, mode === 'register' && styles.activeTab]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>
                Crear Cuenta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, mode === 'login' && styles.activeTab]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tarjeta de Formulario */}
          <Card style={styles.formCard}>
            {mode === 'register' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tu Nombre o Apodo:</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="account-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Ej. Carlos Mendoza"
                    placeholderTextColor={colors.textMuted}
                    style={styles.inputField}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico:</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="usuario@ejemplo.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.inputField}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña:</Text>
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  style={styles.inputField}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Button
              title={mode === 'register' ? 'Crear mi Cuenta' : 'Iniciar Sesión'}
              size="lg"
              loading={isLoading}
              onPress={handleSubmit}
              style={{ marginTop: spacing.md }}
            />
          </Card>

          {/* Divisor */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o también</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Acceso Rápido como Invitado */}
          <Button
            title="Continuar como Invitado (Modo Demo)"
            variant="outline"
            size="md"
            icon={<MaterialCommunityIcons name="account-clock-outline" size={18} color={colors.primary} />}
            onPress={handleGuestLogin}
            style={styles.guestButton}
          />
          <Text style={styles.guestHint}>
            Puedes explorar todas las funciones inmediatamente y vincular un correo más tarde.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  appTagline: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  activeTab: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: {
    marginRight: spacing.xs,
  },
  inputField: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
  },
  eyeBtn: {
    padding: spacing.xs,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  guestButton: {
    marginBottom: spacing.xs,
  },
  guestHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});

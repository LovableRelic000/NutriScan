// Pantalla de Onboarding y Configuración de Perfil Inicial

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { lightColors as colors, spacing, borderRadius } from '@/core/theme';
import {
  CANONICAL_ALLERGIES,
  ALLERGY_LABELS,
  CANONICAL_LIFESTYLES,
  LIFESTYLE_LABELS,
  CanonicalAllergy,
  CanonicalLifestyle,
} from '@/core/constants';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';

export default function OnboardingScreen() {
  const { userDoc, updateHealthProfile, updateGoals, isLoading } = useAuthStore();

  const [step, setStep] = useState<number>(1);
  const [displayName, setDisplayName] = useState<string>(userDoc?.display_name || '');
  const [selectedAllergies, setSelectedAllergies] = useState<CanonicalAllergy[]>(
    userDoc?.health_profile?.allergies || []
  );
  const [selectedLifestyles, setSelectedLifestyles] = useState<CanonicalLifestyle[]>(
    userDoc?.health_profile?.lifestyles || []
  );
  const [customAvoidList, setCustomAvoidList] = useState<string[]>(
    userDoc?.health_profile?.custom_avoid || []
  );
  const [customInput, setCustomInput] = useState<string>('');
  const [stepsGoal, setStepsGoal] = useState<number>(userDoc?.goals?.daily_steps || 8000);
  const [waterGoal, setWaterGoal] = useState<number>(userDoc?.goals?.daily_water_ml || 2000);

  const toggleAllergy = (allergy: CanonicalAllergy) => {
    setSelectedAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  };

  const toggleLifestyle = (lifestyle: CanonicalLifestyle) => {
    setSelectedLifestyles((prev) =>
      prev.includes(lifestyle) ? prev.filter((l) => l !== lifestyle) : [...prev, lifestyle]
    );
  };

  const addCustomAvoid = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (customAvoidList.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Aviso', 'Este ingrediente ya está en tu lista de exclusión.');
      return;
    }
    setCustomAvoidList((prev) => [...prev, trimmed]);
    setCustomInput('');
  };

  const removeCustomAvoid = (index: number) => {
    setCustomAvoidList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
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

      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudieron guardar tus preferencias: ' + (e.message || 'Error desconocido'));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabecera y Barra de Progreso */}
        <View style={styles.header}>
          <Text style={styles.appName}>NutriScan AI</Text>
          <Text style={styles.stepTitle}>Paso {step} de 3</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {step === 1 && (
            <View>
              <Text style={styles.title}>¡Hola! Configura tu perfil</Text>
              <Text style={styles.subtitle}>
                Dinos cómo llamarte y selecciona tus alergias alimentarias para protegerte al escanear.
              </Text>

              <Card style={styles.card}>
                <Text style={styles.inputLabel}>Tu Nombre o Apodo:</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ej. Carlos"
                  placeholderTextColor={colors.textMuted}
                  style={styles.textInput}
                />
              </Card>

              <Text style={styles.sectionHeader}>Alergias o intolerancias comunes:</Text>
              <View style={styles.chipGrid}>
                {CANONICAL_ALLERGIES.map((allergy) => {
                  const item = ALLERGY_LABELS[allergy];
                  const label = item?.name || allergy;
                  const selected = selectedAllergies.includes(allergy);
                  return (
                    <Chip
                      key={allergy}
                      label={label}
                      vectorIcon={item?.vectorIcon}
                      selected={selected}
                      onPress={() => toggleAllergy(allergy)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.title}>Estilo de Vida y Restricciones</Text>
              <Text style={styles.subtitle}>
                Adaptaremos los análisis para advertirte si un producto incumple tu régimen alimentario.
              </Text>

              <Text style={styles.sectionHeader}>Estilo de vida o condición:</Text>
              <View style={styles.chipGrid}>
                {CANONICAL_LIFESTYLES.map((lifestyle) => {
                  const item = LIFESTYLE_LABELS[lifestyle];
                  const label = item?.name || lifestyle;
                  const selected = selectedLifestyles.includes(lifestyle);
                  return (
                    <Chip
                      key={lifestyle}
                      label={label}
                      vectorIcon={item?.vectorIcon}
                      selected={selected}
                      onPress={() => toggleLifestyle(lifestyle)}
                    />
                  );
                })}
              </View>

              <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
                Ingredientes personalizados que evitas:
              </Text>
              <View style={styles.customInputRow}>
                <TextInput
                  value={customInput}
                  onChangeText={setCustomInput}
                  placeholder="Ej. Jarabe de maíz, Canela, Aceite de palma"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                  onSubmitEditing={addCustomAvoid}
                />
                <Button
                  title="Agregar"
                  size="sm"
                  onPress={addCustomAvoid}
                  style={{ marginLeft: spacing.sm }}
                />
              </View>

              {customAvoidList.length > 0 && (
                <View style={[styles.chipGrid, { marginTop: spacing.md }]}>
                  {customAvoidList.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.customChip}
                      onPress={() => removeCustomAvoid(idx)}
                    >
                      <Text style={styles.customChipText}>{item} ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.title}>Tus Metas Diarias de Salud</Text>
              <Text style={styles.subtitle}>
                NutriScan AI también te ayuda a mantener hábitos saludables de hidratación y movimiento.
              </Text>

              <Card style={styles.card}>
                <Text style={styles.inputLabel}>Meta diaria de Pasos:</Text>
                <Text style={styles.goalValue}>{stepsGoal.toLocaleString('es-MX')} pasos</Text>
                <View style={styles.sliderButtons}>
                  <Button
                    title="- 1,000"
                    size="sm"
                    variant="outline"
                    onPress={() => setStepsGoal((s) => Math.max(2000, s - 1000))}
                  />
                  <Button
                    title="+ 1,000"
                    size="sm"
                    variant="outline"
                    onPress={() => setStepsGoal((s) => Math.min(30000, s + 1000))}
                  />
                </View>
              </Card>

              <Card style={styles.card}>
                <Text style={styles.inputLabel}>Meta diaria de Hidratación (Agua):</Text>
                <Text style={styles.goalValue}>{waterGoal} ml ({Math.round(waterGoal / 250)} vasos)</Text>
                <View style={styles.sliderButtons}>
                  <Button
                    title="- 250 ml"
                    size="sm"
                    variant="outline"
                    onPress={() => setWaterGoal((w) => Math.max(1000, w - 250))}
                  />
                  <Button
                    title="+ 250 ml"
                    size="sm"
                    variant="outline"
                    onPress={() => setWaterGoal((w) => Math.min(5000, w + 250))}
                  />
                </View>
              </Card>
            </View>
          )}
        </ScrollView>

        {/* Botones de Navegación Inferiores */}
        <View style={styles.footer}>
          {step > 1 ? (
            <Button
              title="Atrás"
              variant="outline"
              size="md"
              onPress={() => setStep((s) => s - 1)}
              style={{ flex: 1, marginRight: spacing.md }}
            />
          ) : null}
          {step < 3 ? (
            <Button
              title="Siguiente"
              size="md"
              onPress={() => setStep((s) => s + 1)}
              style={{ flex: 2 }}
            />
          ) : (
            <Button
              title="Guardar y Comenzar"
              size="md"
              loading={isLoading}
              onPress={handleFinish}
              style={{ flex: 2 }}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    paddingVertical: spacing.md,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  stepTitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customChip: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  customChipText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  goalValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginVertical: spacing.sm,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});

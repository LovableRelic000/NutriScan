// Pantalla de OCR Manual (Ideal para probar el 100% del analizador en Expo Go)

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
import { borderRadius, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { analyzeIngredients, AnalysisResult } from '@/services/analyzer/ingredientAnalyzer';
import { ScanRepository } from '@/data/repositories/scanRepository';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const PRESETS = [
  {
    title: 'Leche Entera (Inglés - Whole Milk)',
    text: 'Grade A Organic Whole Milk. Ingredients: Pasteurized organic whole milk, vitamin D3. Contains: Milk. Keep refrigerated at 4°C.',
  },
  {
    title: 'Galletas (Leche y Cacahuate)',
    text: 'Galletas de chocolate crujientes. Ingredientes: Harina de trigo, azúcar refinada, aceite vegetal, leche en polvo, manteca de cacao, cacahuates tostados, lecitina de soya, sal yodada. Elaborado por Galletas del Norte S.A. Información nutrimental por porción.',
  },
  {
    title: 'Sopa Instantánea (Sal y MSG)',
    text: 'Sopa sabor pollo. Ingredientes: Fideos enriquecidos, sal yodada, grasa de palma, glutamato monosodico (MSG), extracto de levadura, azucar, cebolla en polvo, dioxido de silicio, caldo de pollo concentrado. Conservese en lugar seco.',
  },
  {
    title: 'Barra Snack Vegana con Miel',
    text: 'Barra energética natural. Ingredientes: Avena integral en hojuelas, almendras tostadas, miel de abeja pura, semillas de girasol, coco rallado, canela en polvo. Declaración nutrimental en el reverso.',
  },
  {
    title: 'Snack 100% Manzana (Seguro)',
    text: 'Manzana horneada crujiente. Ingredientes: Manzana deshidratada natural, canela en polvo y acido citrico. Informacion nutrimental por empaque.',
  },
  {
    title: 'Cereal con Trazas de Alérgeno',
    text: 'Hojuelas de maíz tostadas. Ingredientes: Maiz seleccionado, azucar, extracto de malta, sal. Puede contener trazas de leche y cacahuate. Hecho en Mexico.',
  },
  {
    title: 'Sin Sección de Ingredientes',
    text: 'Bebida carbonatada refrescante sabor limon con extractos naturales y minerales de manantial. Disfrutala bien fria.',
  },
];

export default function ManualOcrScreen() {
  const { colors, isDark } = useTheme();
  const { user, userDoc } = useAuthStore();
  const [inputText, setInputText] = useState<string>(PRESETS[0].text);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showRawText, setShowRawText] = useState<boolean>(false);

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      Alert.alert('Aviso', 'Por favor ingresa o pega el texto de una etiqueta para analizar.');
      return;
    }

    const healthProfile = userDoc?.health_profile || {
      allergies: [],
      lifestyles: [],
      custom_avoid: [],
    };

    const result = analyzeIngredients(inputText, healthProfile);
    setAnalysis(result);
  };

  const handleSaveToHistory = async () => {
    if (!analysis || !user) return;
    try {
      setIsSaving(true);
      await ScanRepository.addScan(user.uid, {
        created_at: Timestamp.now(),
        status: analysis.status,
        product_name: 'Análisis de Etiqueta',
        raw_text: analysis.raw_text,
        ingredient_section_found: analysis.ingredient_section_found,
        flags: analysis.flags,
        lux_at_scan: null,
        flash_used: false,
      });
      Alert.alert('Éxito', 'El resultado fue guardado en tu historial.');
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo guardar el escaneo: ' + (e.message || 'Error desconocido'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Regresar</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Analizador de Texto</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Prueba la lógica de detección de alérgenos y estilos de vida pegando el texto de un empaque o usando un preset.
          </Text>
        </View>

        {/* Presets */}
        <Text style={styles.sectionLabel}>Cargar ejemplos rápidos:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
          {PRESETS.map((preset, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.presetChip}
              onPress={() => {
                setInputText(preset.text);
                setAnalysis(null);
              }}
            >
              <Text style={styles.presetChipText}>{preset.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Entrada de Texto */}
        <Card style={styles.inputCard}>
          <Text style={styles.inputTitle}>Texto de la etiqueta:</Text>
          <TextInput
            multiline
            numberOfLines={5}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              setAnalysis(null);
            }}
            placeholder="Pega aquí los ingredientes del producto..."
            placeholderTextColor={colors.textMuted}
            style={styles.textArea}
            textAlignVertical="top"
          />
          <Button
            title="Analizar Etiqueta"
            onPress={handleAnalyze}
            style={{ marginTop: spacing.md }}
          />
        </Card>

        {/* Resultado del Análisis */}
        {analysis && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultSectionTitle}>Resultado del Análisis</Text>
            <Card
              style={[
                styles.resultCard,
                {
                  borderColor:
                    analysis.status === 'SAFE'
                      ? colors.safe
                      : analysis.status === 'CAUTION'
                      ? colors.caution
                      : analysis.status === 'DANGER'
                      ? colors.danger
                      : colors.unverified,
                },
              ]}
            >
              <View style={styles.badgeRow}>
                <Badge status={analysis.status} size="lg" />
              </View>

              <Text style={styles.summaryMessage}>{analysis.summaryMessage}</Text>

              {/* Lista de Alertas / Banderas */}
              {analysis.flags.length > 0 && (
                <View style={styles.flagsList}>
                  <Text style={styles.flagsHeader}>Ingredientes observados:</Text>
                  {analysis.flags.map((flag, i) => (
                    <View key={i} style={styles.flagItem}>
                      <View
                        style={[
                          styles.flagIndicator,
                          {
                            backgroundColor:
                              flag.severity === 'danger' ? colors.danger : colors.caution,
                          },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flagIngredient}>
                          {flag.ingredient.toUpperCase()}
                          {flag.category === 'trace' ? ' (Traza)' : ''}
                        </Text>
                        <Text style={styles.flagReason}>{flag.reason}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Botón para alternar texto raw */}
              <TouchableOpacity
                onPress={() => setShowRawText(!showRawText)}
                style={styles.toggleRawButton}
              >
                <Text style={styles.toggleRawText}>
                  {showRawText ? '▲ Ocultar texto analizado' : '▼ Ver texto analizado'}
                </Text>
              </TouchableOpacity>

              {showRawText && (
                <View style={styles.rawTextContainer}>
                  <Text style={styles.rawTextTitle}>Ingredientes extraídos:</Text>
                  <Text style={styles.rawTextContent}>
                    {analysis.ingredients_text || 'No se identificó lista aislada'}
                  </Text>
                  {analysis.traces_text ? (
                    <>
                      <Text style={[styles.rawTextTitle, { marginTop: spacing.xs }]}>
                        Trazas advertidas:
                      </Text>
                      <Text style={styles.rawTextContent}>{analysis.traces_text}</Text>
                    </>
                  ) : null}
                </View>
              )}

              {/* Guardar en Historial de Firestore */}
              {user && (
                <Button
                  title={isSaving ? 'Guardando...' : 'Guardar en mi Historial'}
                  variant="outline"
                  loading={isSaving}
                  onPress={handleSaveToHistory}
                  style={{ marginTop: spacing.md }}
                />
              )}
            </Card>
          </View>
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
  backButton: {
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  presetChip: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  presetChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  inputCard: {
    marginBottom: spacing.md,
  },
  inputTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  textArea: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
  },
  resultContainer: {
    marginTop: spacing.md,
  },
  resultSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resultCard: {
    borderWidth: 2,
  },
  badgeRow: {
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  flagsList: {
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  flagsHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: spacing.xs,
  },
  flagIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: spacing.sm,
  },
  flagIngredient: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  flagReason: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  toggleRawButton: {
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  toggleRawText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  rawTextContainer: {
    backgroundColor: colors.surfaceVariant,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  rawTextTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rawTextContent: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 2,
  },
});

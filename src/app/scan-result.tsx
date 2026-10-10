// Pantalla de Detalle y Semáforo del Resultado de Escaneo

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, shadows, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import {
  ScanStatusType,
  STATUS_DETAILS,
  ALLERGY_LABELS,
  LIFESTYLE_LABELS,
  CanonicalAllergy,
  CanonicalLifestyle,
} from '@/core/constants';
import { ScanFlag } from '@/data/models/scan';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function ScanResultScreen() {
  const params = useLocalSearchParams<{
    status?: string;
    productName?: string;
    rawText?: string;
    ingredientSectionFound?: string;
    flags?: string;
    luxAtScan?: string;
    flashUsed?: string;
  }>();

  const status: ScanStatusType = (params.status as ScanStatusType) || 'UNVERIFIED';
  const productName = params.productName || 'Producto Escaneado';
  const rawText = params.rawText || '';
  const ingredientSectionFound = params.ingredientSectionFound === 'true';
  const flags: ScanFlag[] = params.flags ? JSON.parse(params.flags) : [];
  const luxAtScan = params.luxAtScan ? Number(params.luxAtScan) : null;
  const flashUsed = params.flashUsed === 'true';

  const [showRawText, setShowRawText] = useState(false);
  const { colors, isDark } = useTheme();

  const statusConfig = STATUS_DETAILS[status] || STATUS_DETAILS.UNVERIFIED;
  const statusColor = colors[statusConfig.colorKey];

  const getTriggerLabel = (trigger: string) => {
    if (trigger in ALLERGY_LABELS) {
      return ALLERGY_LABELS[trigger as CanonicalAllergy].name;
    }
    if (trigger in LIFESTYLE_LABELS) {
      return LIFESTYLE_LABELS[trigger as CanonicalLifestyle].name;
    }
    if (trigger === 'custom_avoid') {
      return 'Ingrediente personalizado a evitar';
    }
    return trigger;
  };

  const getDetailedExplanation = () => {
    switch (status) {
      case 'SAFE':
        return 'Revisamos la sección de ingredientes y no contiene ninguno de tus alérgenos ni ingredientes restringidos.';
      case 'CAUTION':
        return 'Encontramos ingredientes que entran en conflicto con tu estilo de vida seleccionado o trazas de alérgenos.';
      case 'DANGER':
        return '¡ALERTA! Este producto contiene alérgenos declarados en tu perfil de salud que podrían representar un riesgo.';
      case 'UNVERIFIED':
      default:
        return 'No se logró identificar con certeza la lista de ingredientes. Te recomendamos reintentar con mejor luz o enfocar la sección de ingredientes.';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Barra superior */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/scanner')} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
            <Text style={styles.backButtonText}>Escáner</Text>
          </TouchableOpacity>
          <Text style={[styles.productTitle, { color: colors.text }]}>{productName}</Text>
        </View>

        {/* Semáforo Hero Rediseñado */}
        <View style={[styles.semaphoreHero, { backgroundColor: statusColor + '0E', borderColor: statusColor + '40' }]}>
          <View style={[styles.heroHalo, { backgroundColor: statusColor + '15' }]}>
            <View style={[styles.heroIconCircle, { backgroundColor: statusColor + '25', borderColor: statusColor + '55' }]}>
              <MaterialCommunityIcons
                name={statusConfig.vectorIcon as any}
                size={40}
                color={statusColor}
              />
            </View>
          </View>

          <Text style={[styles.heroStatusText, { color: statusColor }]}>
            {statusConfig.title}
          </Text>

          <Badge status={status} size="md" style={{ alignSelf: 'center', marginVertical: 4 }} />

          <Text style={styles.heroDescription}>{getDetailedExplanation()}</Text>
        </View>

        {/* Metadatos del Escaneo (Lux, Flash) */}
        <Card style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="lightbulb-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.metaLabel}>Iluminación al escanear:</Text>
            </View>
            <Text style={styles.metaValue}>{luxAtScan !== null ? `${Math.round(luxAtScan)} lux` : 'N/A'}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="flash-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.metaLabel}>Flash automático:</Text>
            </View>
            <Text style={styles.metaValue}>{flashUsed ? 'Activado' : 'No requerido'}</Text>
          </View>
          <View style={styles.metaRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="text-box-search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.metaLabel}>Sección detectada:</Text>
            </View>
            <Text style={styles.metaValue}>{ingredientSectionFound ? 'Sí, identificada' : 'No encontrada'}</Text>
          </View>
        </Card>

        {/* Lista de Alérgenos e Ingredientes Conflictivos */}
        {flags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredientes que activaron alertas ({flags.length}):</Text>
            {flags.map((flag, idx) => {
              const isDanger = flag.severity === 'danger';
              return (
                <Card
                  key={idx}
                  style={[
                    styles.flagCard,
                    { borderLeftColor: isDanger ? colors.danger : colors.caution, borderLeftWidth: 5 },
                  ]}
                >
                  <View style={styles.flagHeaderRow}>
                    <Text style={styles.flagIngredientName}>
                      {flag.ingredient.toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.severityTag,
                        { backgroundColor: isDanger ? colors.danger + '20' : colors.caution + '20' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={isDanger ? 'alert-octagon' : 'alert'}
                        size={12}
                        color={isDanger ? colors.danger : colors.caution}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.severityTagText,
                          { color: isDanger ? colors.danger : colors.caution },
                        ]}
                      >
                        {isDanger ? 'PELIGRO' : 'PRECAUCIÓN'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.flagReasonText}>{flag.reason}</Text>
                  <Text style={styles.flagTriggerText}>
                    {flag.category === 'trace'
                      ? 'Advertencia de trazas / contaminación'
                      : `Alerta por: ${getTriggerLabel(flag.profile_trigger)}`}
                  </Text>
                </Card>
              );
            })}
          </View>
        )}

        {/* Texto OCR Colapsable */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.collapseHeader}
            onPress={() => setShowRawText(!showRawText)}
          >
            <MaterialCommunityIcons
              name={showRawText ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.collapseTitle}>
              {showRawText ? 'Ocultar texto capturado (OCR)' : 'Ver texto capturado (OCR)'}
            </Text>
          </TouchableOpacity>

          {showRawText && (
            <Card style={styles.rawTextCard}>
              <Text style={styles.rawText}>{rawText || 'Sin texto extraído'}</Text>
            </Card>
          )}
        </View>

        {/* Acciones */}
        <View style={styles.actionButtons}>
          <Button
            title="Escanear otro producto"
            size="lg"
            onPress={() => router.replace('/(tabs)/scanner')}
            style={{ marginBottom: spacing.sm }}
          />

          <Button
            title="Consultar al Asistente Nutri-AI Pro"
            variant="outline"
            size="md"
            onPress={() => router.push('/(tabs)/chat')}
            style={{ marginBottom: spacing.sm }}
          />

          <Button
            title="Ver Historial de Escaneos"
            variant="ghost"
            size="sm"
            onPress={() => router.push('/(tabs)/history')}
          />
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
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  semaphoreHero: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  heroHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  heroStatusText: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  metaCard: {
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  flagCard: {
    marginBottom: spacing.sm,
  },
  flagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flagIngredientName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  severityTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  flagReasonText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
  flagTriggerText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  collapseHeader: {
    paddingVertical: spacing.xs,
  },
  collapseTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  rawTextCard: {
    marginTop: spacing.xs,
    backgroundColor: colors.surfaceVariant,
  },
  rawText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionButtons: {
    marginTop: spacing.md,
  },
});

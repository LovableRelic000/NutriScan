// Pantalla de Historial de Escaneos (Firestore Listener en Tiempo Real)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { ScanRepository } from '@/data/repositories/scanRepository';
import { ScanDocument } from '@/data/models/scan';
import { formatDisplayDate, formatDisplayTime } from '@/core/utils';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export default function HistoryScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const [scans, setScans] = useState<ScanDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = ScanRepository.subscribeRecentScans(
      user.uid,
      20,
      (newScans) => {
        setScans(newScans);
        setLoading(false);
      },
      (err) => {
        console.error('Error al escuchar historial:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = (scanId?: string) => {
    if (!user || !scanId) return;
    Alert.alert(
      'Eliminar Escaneo',
      '¿Deseas eliminar este registro de tu historial?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await ScanRepository.deleteScan(user.uid, scanId);
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar el registro: ' + err.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ScanDocument }) => {
    const scanDate = item.created_at?.toDate ? item.created_at.toDate() : new Date();

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          router.push({
            pathname: '/scan-result',
            params: {
              status: item.status,
              productName: item.product_name || 'Producto Escaneado',
              rawText: item.raw_text,
              ingredientSectionFound: String(item.ingredient_section_found),
              flags: JSON.stringify(item.flags || []),
              luxAtScan: item.lux_at_scan !== null ? String(item.lux_at_scan) : '',
              flashUsed: String(item.flash_used),
            },
          });
        }}
      >
        <Card style={styles.scanCard}>
          <View style={styles.cardHeader}>
            <Badge status={item.status} size="sm" />
            <Text style={styles.dateText}>
              {formatDisplayDate(scanDate)} • {formatDisplayTime(scanDate)}
            </Text>
          </View>

          <Text style={[styles.productName, { color: colors.text }]}>
            {item.product_name || 'Etiqueta de alimentos'}
          </Text>

          {item.flags && item.flags.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.caution} style={{ marginRight: 4 }} />
              <Text style={styles.flagsSummary}>
                {item.flags.length} {item.flags.length === 1 ? 'observación' : 'observaciones'}:{' '}
                {item.flags.map((f) => f.ingredient).join(', ')}
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
              <MaterialCommunityIcons name="shield-check-outline" size={16} color={colors.safe} style={{ marginRight: 4 }} />
              <Text style={styles.safeSummary}>
                Sin alérgenos conflictivos encontrados
              </Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {item.lux_at_scan !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                  <MaterialCommunityIcons name="lightbulb-outline" size={14} color={colors.textMuted} style={{ marginRight: 2 }} />
                  <Text style={styles.metaInfo}>{Math.round(item.lux_at_scan)} lux</Text>
                </View>
              )}
              {item.flash_used && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="flash-outline" size={14} color={colors.textMuted} style={{ marginRight: 2 }} />
                  <Text style={styles.metaInfo}>Flash</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.deleteButton, { flexDirection: 'row', alignItems: 'center' }]}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
              <Text style={styles.deleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Historial de Escaneos</Text>
          <Text style={styles.subtitle}>
            Tus últimos 20 productos analizados con semáforo y detalles.
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
        ) : scans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="clipboard-text-clock-outline"
              size={64}
              color={colors.textMuted}
              style={{ marginBottom: spacing.md }}
            />
            <Text style={styles.emptyTitle}>Aún no hay escaneos guardados</Text>
            <Text style={styles.emptyDesc}>
              Escanea una etiqueta con la cámara o prueba el analizador manual para ver tus registros aquí.
            </Text>
            <Button
              title="Ir al Escáner"
              onPress={() => router.push('/(tabs)/scanner')}
              style={{ width: '70%', marginTop: spacing.md }}
            />
            <Button
              title="Probar Modo Manual"
              variant="outline"
              onPress={() => router.push('/manual-ocr')}
              style={{ width: '70%', marginTop: spacing.sm }}
            />
          </View>
        ) : (
          <FlatList
            data={scans}
            keyExtractor={(item, index) => item.id || String(index)}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  scanCard: {
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  flagsSummary: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  safeSummary: {
    fontSize: 13,
    color: colors.safe,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  metaInfo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    paddingVertical: 2,
  },
  deleteText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
});

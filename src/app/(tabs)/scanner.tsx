// Pantalla Principal del Escáner (CameraView + Sensor de Luz + Flash Histéresis + OCR + Perfil Activo Visible)

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { borderRadius, shadows, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAutoTorch, TorchMode } from '@/services/sensors/useAutoTorch';
import { getOcrService, isMlKitAvailable } from '@/services/ocr/ocrService';
import { analyzeIngredients } from '@/services/analyzer/ingredientAnalyzer';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { ScanRepository } from '@/data/repositories/scanRepository';
import { ALLERGY_LABELS, LIFESTYLE_LABELS } from '@/core/constants';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');
const SCAN_FRAME_SIZE = width * 0.78;

export default function ScannerScreen() {
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const { user, userDoc } = useAuthStore();
  const { mode, setMode, currentLux, torchActive } = useAutoTorch('auto', isFocused);

  // Si los permisos no han cargado aún
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Iniciando cámara...</Text>
      </View>
    );
  }

  // Si el permiso fue denegado
  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="camera-off" size={64} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
        <Text style={[styles.permissionTitle, { color: colors.text }]}>Permiso de Cámara Requerido</Text>
        <Text style={styles.permissionDesc}>
          NutriScan AI necesita acceso a la cámara para escanear y analizar la lista de ingredientes de tus alimentos.
        </Text>
        <Button
          title="Conceder Permiso"
          onPress={requestPermission}
          style={{ width: '80%', marginBottom: spacing.sm }}
        />
        <Button
          title="Abrir Ajustes del Teléfono"
          variant="outline"
          onPress={() => Linking.openSettings()}
          style={{ width: '80%', marginBottom: spacing.md }}
        />
        <Button
          title="O usar Modo Texto Manual"
          variant="ghost"
          onPress={() => router.push('/manual-ocr')}
        />
      </SafeAreaView>
    );
  }

  const cycleTorchMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextMode: TorchMode = mode === 'auto' ? 'on' : mode === 'on' ? 'off' : 'auto';
    setMode(nextMode);
  };

  const activeAllergies = userDoc?.health_profile?.allergies || [];
  const activeLifestyles = userDoc?.health_profile?.lifestyles || [];
  const activeCustom = userDoc?.health_profile?.custom_avoid || [];
  const totalRestrictions = activeAllergies.length + activeLifestyles.length + activeCustom.length;

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Si estamos en Expo Go sin ML Kit compilado, advertir y ofrecer el modo manual
      if (!isMlKitAvailable()) {
        setIsProcessing(false);
        Alert.alert(
          'Modo Expo Go Detectado',
          'El OCR automático en tiempo real requiere el módulo nativo compilado (Development Build). ¿Deseas probar el flujo completo con la pantalla de texto manual?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Texto Manual',
              onPress: () => router.push('/manual-ocr'),
            },
          ]
        );
        return;
      }

      // Tomar foto
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        throw new Error('No se pudo capturar la imagen');
      }

      // Ejecutar OCR nativo
      const ocrService = getOcrService();
      const ocrText = await ocrService.recognize(photo.uri);

      // Analizar texto extraído con el perfil actual de salud
      const healthProfile = userDoc?.health_profile || {
        allergies: [],
        lifestyles: [],
        custom_avoid: [],
      };

      const result = analyzeIngredients(ocrText, healthProfile);

      // Guardar en Firestore si el usuario está autenticado
      if (user) {
        await ScanRepository.addScan(user.uid, {
          created_at: Timestamp.now(),
          status: result.status,
          product_name: 'Producto Escaneado',
          raw_text: result.raw_text,
          ingredient_section_found: result.ingredient_section_found,
          flags: result.flags,
          lux_at_scan: currentLux,
          flash_used: torchActive,
        });
      }

      Haptics.notificationAsync(
        result.status === 'DANGER'
          ? Haptics.NotificationFeedbackType.Error
          : result.status === 'CAUTION'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );

      // Navegar a la pantalla de resultado
      router.push({
        pathname: '/scan-result',
        params: {
          status: result.status,
          productName: 'Producto Escaneado',
          rawText: result.raw_text,
          ingredientSectionFound: String(result.ingredient_section_found),
          flags: JSON.stringify(result.flags),
          luxAtScan: currentLux ? String(currentLux) : '',
          flashUsed: String(torchActive),
        },
      });
    } catch (err: any) {
      Alert.alert('Error al escanear', err.message || 'No se pudo procesar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          enableTorch={isFocused && torchActive}
          facing="back"
        >
          <SafeAreaView style={styles.overlay}>
          {/* Barra superior con controles y sensor de luz */}
          <View style={styles.topBar}>
            {/* Chip de Lux ambiental */}
            <View style={styles.luxChip}>
              <MaterialCommunityIcons name="white-balance-sunny" size={15} color="#FBBF24" style={{ marginRight: 4 }} />
              <Text style={styles.luxText}>
                {currentLux !== null ? `${Math.round(currentLux)} lux` : 'Sensor N/A'}
              </Text>
            </View>

            {/* Selector de Flash (Auto / On / Off) */}
            <TouchableOpacity onPress={cycleTorchMode} style={styles.torchButton}>
              <MaterialCommunityIcons
                name={mode === 'auto' ? (torchActive ? 'flash-auto' : 'flash-off') : mode === 'on' ? 'flash' : 'flash-off'}
                size={16}
                color="#FBBF24"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.torchText}>
                {mode === 'auto' ? `Auto (${torchActive ? 'ON' : 'OFF'})` : mode === 'on' ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>

            {/* Botón rápido a OCR Manual */}
            <TouchableOpacity
              onPress={() => router.push('/manual-ocr')}
              style={styles.manualButton}
            >
              <MaterialCommunityIcons name="text-box-edit-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.manualButtonText}>Manual</Text>
            </TouchableOpacity>
          </View>

          {/* Banner de Perfil Activo para Verificación Visual */}
          <View style={styles.activeProfileContainer}>
            {totalRestrictions > 0 ? (
              <View style={styles.activeProfileBadge}>
                <MaterialCommunityIcons name="shield-check" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: width * 0.8 }}>
                  <Text style={styles.activeProfileText}>
                    Reglas activas:{' '}
                    {[
                      ...activeAllergies.map((a) => ALLERGY_LABELS[a]?.name || a),
                      ...activeLifestyles.map((l) => LIFESTYLE_LABELS[l]?.name || l),
                      ...activeCustom,
                    ].join(', ')}
                  </Text>
                </ScrollView>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.emptyProfileWarning}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <MaterialCommunityIcons name="alert" size={16} color="#B45309" style={{ marginRight: 6 }} />
                <Text style={styles.emptyProfileText}>
                  Sin alérgenos configurados (Toca para agregar Lactosa, Gluten...)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Guía visual del área de escaneo */}
          <View style={styles.frameContainer}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <View style={styles.guideBox}>
              <MaterialCommunityIcons name="barcode-scan" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.guideText}>
                Apunta a la sección de "Ingredientes"
              </Text>
            </View>
          </View>

          {/* Barra Inferior con Botón de Disparo */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCapture}
              disabled={isProcessing}
              style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            >
              <View style={styles.captureInner}>
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <MaterialCommunityIcons name="camera" size={32} color={colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.textSecondary,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  permissionDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  luxChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  luxText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  torchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  torchText: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '700',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  manualButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activeProfileContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  activeProfileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeProfileText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyProfileWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  emptyProfileText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '700',
  },
  frameContainer: {
    alignItems: 'center',
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE * 0.75,
    borderRadius: borderRadius.lg,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: borderRadius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: borderRadius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: borderRadius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: borderRadius.md,
  },
  guideBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  captureButton: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

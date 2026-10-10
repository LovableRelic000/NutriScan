// Pantalla de Suscripción Nutri-AI Pro con Pasarela Stripe (Modo de Prueba / Test Mode)

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { borderRadius, shadows, spacing, colors } from '@/core/theme';
import { useTheme } from '@/core/themeStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { BiometricsService } from '@/services/biometrics/biometricsService';
import { StripeService } from '@/services/stripe/stripeService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SubscriptionScreen() {
  const { colors, isDark } = useTheme();
  const { isPro, setProStatus, isLoading } = useAuthStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [processingState, setProcessingState] = useState<'idle' | 'connecting' | 'authorizing' | 'success'>('idle');

  // Datos del formulario de pago Stripe Test Mode
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const parts = cleaned.match(/[\s\S]{1,4}/g) || [];
    return parts.join(' ');
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleFillTestCard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('12/28');
    setCardCvc('123');
    setCardHolder('Alumno Demostración');
  };

  const handleStartPurchase = () => {
    setModalVisible(true);
    setProcessingState('idle');
  };

  const handleProcessStripePayment = async () => {
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.length < 16) {
      Alert.alert('Tarjeta Inválida', 'Por favor ingresa un número de tarjeta de 16 dígitos (o pulsa "Autocompletar Tarjeta de Prueba").');
      return;
    }
    if (cardExpiry.length < 5) {
      Alert.alert('Fecha Inválida', 'Ingresa la fecha de expiración en formato MM/AA.');
      return;
    }
    if (cardCvc.length < 3) {
      Alert.alert('CVC Inválido', 'Ingresa el código de seguridad de 3 dígitos.');
      return;
    }

    try {
      // Paso 1: Tokenización y creación de PaymentIntent con Stripe API
      setProcessingState('connecting');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const [expMonth, expYear] = cardExpiry.split('/');
      const stripeResult = await StripeService.processSubscription({
        number: cleanNum,
        expMonth: expMonth || '12',
        expYear: expYear || '28',
        cvc: cardCvc,
      });

      if (!stripeResult.success) {
        throw new Error(stripeResult.errorMessage || 'Transacción rechazada por Stripe.');
      }

      // Paso 2: Autenticación / Biometría del dispositivo (SCA / 3D-Secure)
      setProcessingState('authorizing');
      const bioResult = await BiometricsService.authenticate(
        'Autorización Segura: Confirma la suscripción de $99.00 MXN'
      );

      if (!bioResult.success) {
        Alert.alert('Pago Cancelado', 'La autorización biométrica fue rechazada o cancelada.');
        setProcessingState('idle');
        return;
      }

      // Paso 3: Aprobación y activación
      setProcessingState('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await setProStatus(true);
      await new Promise((r) => setTimeout(r, 800));

      setModalVisible(false);
      setProcessingState('idle');

      Alert.alert(
        '¡Suscripción Pro Activada! 🎉',
        `Transacción confirmada por Stripe.\nID: ${stripeResult.paymentIntentId}\nRecibo: ${stripeResult.receiptNumber}\nTarjeta: ${stripeResult.brand} •••• ${stripeResult.last4}`,
        [
          {
            text: 'Ir al Asistente Nutri-AI',
            onPress: () => router.replace('/(tabs)/chat'),
          },
          { text: 'Entendido', style: 'default' },
        ]
      );
    } catch (e: any) {
      setProcessingState('idle');
      Alert.alert('Error en el pago', e.message || 'No se pudo procesar la transacción.');
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar Suscripción',
      '¿Deseas volver al plan gratuito? El asistente inteligente de nutrición quedará bloqueado.',
      [
        { text: 'Mantener Pro', style: 'cancel' },
        {
          text: 'Volver a Plan Gratuito',
          style: 'destructive',
          onPress: async () => {
            try {
              await setProStatus(false);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert('Suscripción Cancelada', 'Has regresado al plan gratuito.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Cabecera */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={colors.primary} />
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Planes de NutriScan AI</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Elige el nivel de acompañamiento para tu alimentación y bienestar.
          </Text>
        </View>

        {/* Tarjeta Plan Free */}
        <Card style={[styles.planCard, !isPro && styles.activePlanCard]}>
          <View style={styles.planHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.planName}>Plan Básico (Free)</Text>
            </View>
            {!isPro && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>TU PLAN ACTUAL</Text>
              </View>
            )}
          </View>
          <Text style={styles.planPrice}>$0 MXN / siempre</Text>

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check" size={18} color={colors.safe} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Escáner de etiquetas con semáforo nutricional</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check" size={18} color={colors.safe} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Detección de alérgenos y estilos de vida</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check" size={18} color={colors.safe} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Historial completo de escaneos</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check" size={18} color={colors.safe} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Seguimiento diario de hidratación y pasos</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={styles.featureItemDisabled}>Asistente inteligente de nutrición</Text>
            </View>
          </View>
        </Card>

        {/* Tarjeta Plan Pro */}
        <Card style={[styles.planCard, isPro ? styles.activeProCard : styles.proHighlightCard]}>
          <View style={styles.planHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialCommunityIcons name="star" size={24} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.proTitle}>Nutri-AI Pro</Text>
            </View>
            {isPro && (
              <View style={[styles.currentBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.currentBadgeText}>PLAN ACTIVO</Text>
              </View>
            )}
          </View>
          <Text style={styles.planPrice}>$99.00 MXN / mes</Text>
          <Text style={styles.gatewayNotice}>
            Pago protegido con cifrado SSL · Cancela cuando quieras
          </Text>

          <View style={styles.featuresList}>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Todo lo incluido en el Plan Básico</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Asistente Nutri-AI Pro ilimitado con IA</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Análisis contextual basado en tu perfil de alérgenos</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Consejos de crononutrición e hidratación adaptados</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.featureItem}>Validación de compra segura con 3D-Secure</Text>
            </View>
          </View>

          {isPro ? (
            <Button
              title="Cancelar Suscripción Pro"
              variant="outline"
              size="md"
              onPress={handleCancelSubscription}
              style={{ marginTop: spacing.md }}
            />
          ) : (
            <Button
              title="Suscribirse ($99.00 MXN)"
              variant="primary"
              size="lg"
              loading={isLoading}
              onPress={handleStartPurchase}
              style={{ marginTop: spacing.md, backgroundColor: colors.accent }}
            />
          )}
        </Card>

        {/* Modal de Pasarela de Pagos Stripe (Modo de Prueba) */}
        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (processingState === 'idle') setModalVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <Card style={styles.stripeModalCard}>
              {/* Encabezado Pago Seguro */}
              <View style={styles.stripeHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="shield-check" size={24} color="#635BFF" style={{ marginRight: 8 }} />
                  <Text style={styles.stripeBrandText}>Pago Seguro</Text>
                </View>
                <View style={styles.testBadge}>
                  <Text style={styles.testBadgeText}>DEMO</Text>
                </View>
              </View>

              <Text style={styles.checkoutTitle}>Checkout Seguro NutriScan AI</Text>
              <Text style={styles.checkoutAmount}>Total a autorizar: $99.00 MXN</Text>

              {/* Botón rápido para demo: Rellenar tarjeta de prueba */}
              <TouchableOpacity
                style={styles.fillHelperBtn}
                onPress={handleFillTestCard}
                disabled={processingState !== 'idle'}
              >
                <MaterialCommunityIcons name="auto-fix" size={16} color="#635BFF" style={{ marginRight: 6 }} />
                <Text style={styles.fillHelperText}>Autocompletar Tarjeta de Prueba (4242...)</Text>
              </TouchableOpacity>

              {/* Formulario de Tarjeta */}
              <View style={styles.formSection}>
                <Text style={styles.fieldLabel}>Número de Tarjeta</Text>
                <View style={styles.cardInputRow}>
                  <MaterialCommunityIcons
                    name={cardNumber.startsWith('4') ? 'credit-card-outline' : 'credit-card'}
                    size={20}
                    color={colors.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                    placeholder="4242 4242 4242 4242"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={19}
                    editable={processingState === 'idle'}
                    style={styles.cardTextInput}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Expiración</Text>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                      placeholder="MM/AA"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={5}
                      editable={processingState === 'idle'}
                      style={styles.subInput}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>CVC</Text>
                    <TextInput
                      value={cardCvc}
                      onChangeText={(t) => setCardCvc(t.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                      editable={processingState === 'idle'}
                      style={styles.subInput}
                    />
                  </View>
                </View>

                <View style={{ marginTop: spacing.sm }}>
                  <Text style={styles.fieldLabel}>Nombre del Titular</Text>
                  <TextInput
                    value={cardHolder}
                    onChangeText={setCardHolder}
                    placeholder="Nombre y Apellido"
                    placeholderTextColor={colors.textMuted}
                    editable={processingState === 'idle'}
                    style={styles.subInput}
                  />
                </View>
              </View>

              {/* Estado de procesamiento en vivo */}
              {processingState !== 'idle' && (
                <View style={styles.processingBanner}>
                  <ActivityIndicator size="small" color="#635BFF" style={{ marginRight: 8 }} />
                  <Text style={styles.processingText}>
                    {processingState === 'connecting' && 'Conectando con la pasarela de pagos...'}
                    {processingState === 'authorizing' && 'Validando 3D-Secure con biometría...'}
                    {processingState === 'success' && '¡Autorización exitosa! Activando Pro...'}
                  </Text>
                </View>
              )}

              {/* Indicador de seguridad */}
              <View style={styles.secureBadgeRow}>
                <MaterialCommunityIcons name="lock" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.secureBadgeText}>
                  Encriptación SSL de 256 bits · Pago 100% Seguro
                </Text>
              </View>

              {/* Botones de Acción */}
              <View style={styles.modalButtons}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  size="md"
                  disabled={processingState !== 'idle'}
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1, marginRight: spacing.sm }}
                />
                <Button
                  title="Pagar $99.00"
                  variant="primary"
                  size="md"
                  disabled={processingState !== 'idle'}
                  onPress={handleProcessStripePayment}
                  style={{ flex: 1.6, backgroundColor: '#635BFF' }}
                />
              </View>
            </Card>
          </View>
        </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginLeft: -4,
  },
  backButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  planCard: {
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  activePlanCard: {
    borderColor: colors.primary,
  },
  proHighlightCard: {
    borderColor: colors.accent,
    ...shadows.md,
  },
  activeProCard: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  proTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.accent,
  },
  currentBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  gatewayNotice: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  featuresList: {
    marginVertical: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  featureItem: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  featureItemDisabled: {
    fontSize: 14,
    color: colors.textMuted,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  stripeModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    ...shadows.lg,
  },
  stripeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stripeBrandText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#635BFF',
    letterSpacing: -0.5,
  },
  testBadge: {
    backgroundColor: '#635BFF18',
    borderColor: '#635BFF',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  testBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#635BFF',
  },
  checkoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  checkoutAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  fillHelperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#635BFF12',
    borderWidth: 1,
    borderColor: '#635BFF40',
    borderRadius: borderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  fillHelperText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#635BFF',
  },
  formSection: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  cardTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 1,
  },
  subInput: {
    backgroundColor: colors.surfaceVariant,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  processingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#635BFF10',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#635BFF',
  },
  secureBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  secureBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
});

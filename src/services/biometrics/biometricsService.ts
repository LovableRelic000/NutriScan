// Servicio de Autenticación Biométrica (expo-local-authentication)
// Proporciona compuerta de UI para Bloqueo de Perfil y Confirmación de Pago Pro simulado

import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCheckResult {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

export class BiometricsService {
  /**
   * Verifica la compatibilidad del dispositivo y si hay biometría o credencial registrada
   */
  static async checkAvailability(): Promise<BiometricCheckResult> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
      };
    } catch (e) {
      console.warn('Error al verificar hardware biométrico:', e);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  /**
   * Solicita autenticación biométrica (Huella, Rostro, o PIN/patrón de respaldo)
   *
   * NOTA DE ARQUITECTURA:
   * Se utiliza disableDeviceFallback: false para que el usuario pueda desbloquear con su PIN
   * si el sensor biométrico no está disponible o falla.
   * Esto actúa como compuerta de UI (UI gate) y no representa cifrado criptográfico en reposo.
   */
  static async authenticate(promptMessage: string = 'Confirma tu identidad para continuar'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { hasHardware, isEnrolled } = await this.checkAvailability();

      // Si no tiene hardware biométrico ni credenciales enroladas
      if (!hasHardware && !isEnrolled) {
        // En emuladores o dispositivos sin PIN, permitir pasar con advertencia
        return { success: true };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false, // Permite PIN o patrón del sistema
        fallbackLabel: 'Usar PIN del dispositivo',
      });

      if (result.success) {
        return { success: true };
      }

      return {
        success: false,
        error: result.error || 'Autenticación cancelada',
      };
    } catch (e: any) {
      console.error('Fallo en autenticación biométrica:', e);
      return {
        success: false,
        error: e.message || 'Error inesperado al autenticar',
      };
    }
  }
}

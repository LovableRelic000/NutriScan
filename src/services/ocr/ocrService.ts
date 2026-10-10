// Servicio de OCR desacoplado: ML Kit Nativo (Dev Build) + Modo Manual (Expo Go)

import Constants, { ExecutionEnvironment } from 'expo-constants';

export interface OcrService {
  readonly isNative: boolean;
  recognize(imageUri: string): Promise<string>;
}

/**
 * Verifica si estamos ejecutando dentro de Expo Go estándar
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * Implementación 1: MlKitOcr (Development Build con código nativo compilado)
 */
export class MlKitOcr implements OcrService {
  readonly isNative = true;

  async recognize(imageUri: string): Promise<string> {
    try {
      // Importación dinámica para prevenir errores en tiempo de carga si el módulo nativo no existe
      const MLKit = require('@react-native-ml-kit/text-recognition').default;
      if (!MLKit || typeof MLKit.recognize !== 'function') {
        throw new Error('Módulo nativo ML Kit no registrado.');
      }
      const result = await MLKit.recognize(imageUri);
      return result?.text || '';
    } catch (error: any) {
      console.warn('Error al ejecutar ML Kit OCR:', error);
      throw new Error(
        'El reconocimiento óptico nativo falló o no está compilado en este entorno. Puedes usar el modo de captura manual.'
      );
    }
  }
}

/**
 * Implementación 2: ManualOcr (Fallback para Expo Go sin módulos nativos)
 */
export class ManualOcr implements OcrService {
  readonly isNative = false;

  async recognize(_imageUri: string): Promise<string> {
    // En Expo Go el OCR nativo no está disponible.
    // Retorna una instrucción clara para que el flujo UI invite a usar la pantalla manual.
    return '';
  }
}

/**
 * Verifica en tiempo de ejecución si el módulo nativo de ML Kit está disponible
 */
export function isMlKitAvailable(): boolean {
  if (isExpoGo()) {
    return false;
  }
  try {
    const MLKit = require('@react-native-ml-kit/text-recognition').default;
    return !!MLKit && typeof MLKit.recognize === 'function';
  } catch {
    return false;
  }
}

/**
 * Factoría que selecciona la mejor implementación de OCR disponible
 */
export function getOcrService(): OcrService {
  if (isMlKitAvailable()) {
    return new MlKitOcr();
  }
  return new ManualOcr();
}

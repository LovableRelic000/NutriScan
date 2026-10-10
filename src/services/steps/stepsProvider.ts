// Abstracción de Proveedor de Pasos (StepsProvider)
// Permite alternar limpiamente entre Pedometer estándar (Expo Go y Dev) y Health Connect (Android Nativo)

import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '@/core/utils';

export interface StepsProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  requestPermissions(): Promise<boolean>;
  getAccumulatedSteps(): Promise<number>;
  watchSteps(onDelta: (delta: number) => void): () => void;
}

/**
 * Proveedor Predeterminado: Pedometer con acumulación en AsyncStorage
 * Funciona de inmediato en Expo Go y Development Build
 */
export class PedometerStepsProvider implements StepsProvider {
  readonly name = 'Pedometer (expo-sensors)';

  async isAvailable(): Promise<boolean> {
    try {
      return await Pedometer.isAvailableAsync();
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const res = await Pedometer.requestPermissionsAsync();
      return res.granted;
    } catch {
      return false;
    }
  }

  async getAccumulatedSteps(): Promise<number> {
    const today = getTodayDateString();
    try {
      const stored = await AsyncStorage.getItem(`steps:${today}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  }

  watchSteps(onDelta: (delta: number) => void): () => void {
    let lastStepCount: number | null = null;
    let subscription: any = null;

    try {
      subscription = Pedometer.watchStepCount((result) => {
        if (lastStepCount === null) {
          lastStepCount = result.steps;
          return;
        }

        const delta = result.steps - lastStepCount;
        if (delta > 0) {
          lastStepCount = result.steps;
          onDelta(delta);
        }
      });
    } catch (e) {
      console.warn('Error al suscribir Pedometer:', e);
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }
}

/**
 * Proveedor Opcional: Health Connect (Respaldo inteligente)
 * Detecta dinámicamente si react-native-health-connect está compilado en el build;
 * si no, delega automáticamente a PedometerStepsProvider sin romper el ciclo de vida.
 */
export class HealthConnectStepsProvider implements StepsProvider {
  readonly name = 'Android Health Connect';
  private fallbackProvider = new PedometerStepsProvider();

  async isAvailable(): Promise<boolean> {
    try {
      const HC = require('react-native-health-connect');
      if (HC && typeof HC.initialize === 'function') {
        const status = await HC.getSdkStatus();
        return status === HC.SdkAvailabilityStatus.SDK_AVAILABLE;
      }
      return false;
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    const available = await this.isAvailable();
    if (!available) {
      return await this.fallbackProvider.requestPermissions();
    }

    try {
      const HC = require('react-native-health-connect');
      await HC.initialize();
      const granted = await HC.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
      ]);
      return !!granted;
    } catch {
      return await this.fallbackProvider.requestPermissions();
    }
  }

  async getAccumulatedSteps(): Promise<number> {
    const available = await this.isAvailable();
    if (!available) {
      return await this.fallbackProvider.getAccumulatedSteps();
    }

    try {
      const HC = require('react-native-health-connect');
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

      const result = await HC.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: now.toISOString(),
        },
      });

      const total = (result?.records || []).reduce(
        (sum: number, rec: any) => sum + (rec.count || 0),
        0
      );
      return total;
    } catch {
      return await this.fallbackProvider.getAccumulatedSteps();
    }
  }

  watchSteps(onDelta: (delta: number) => void): () => void {
    // Health Connect en Android es un almacén centralizado histórico.
    // Para cambios en vivo en tiempo real, se apoya en el Pedometer local.
    return this.fallbackProvider.watchSteps(onDelta);
  }
}

/**
 * Obtiene el mejor proveedor disponible para la plataforma
 */
export function getStepsProvider(): StepsProvider {
  return new PedometerStepsProvider();
}

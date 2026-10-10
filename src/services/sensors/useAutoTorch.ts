// Hook para control inteligente de flash/antorcha con sensor de luz ambiental e histéresis

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { LightSensor } from 'expo-sensors';
import { APP_CONFIG } from '@/core/config';

export type TorchMode = 'auto' | 'on' | 'off';

export interface UseAutoTorchResult {
  mode: TorchMode;
  setMode: (mode: TorchMode) => void;
  currentLux: number | null;
  torchActive: boolean;
  isSensorAvailable: boolean;
}

export function useAutoTorch(initialMode: TorchMode = 'auto', enabled: boolean = true): UseAutoTorchResult {
  const [mode, setMode] = useState<TorchMode>(initialMode);
  const [currentLux, setCurrentLux] = useState<number | null>(null);
  const [torchActive, setTorchActive] = useState<boolean>(initialMode === 'on' && enabled);
  const [isSensorAvailable, setIsSensorAvailable] = useState<boolean>(false);

  // Ventana para promedio móvil de lecturas (reduce ruido)
  const luxHistoryRef = useRef<number[]>([]);
  const lastChangeTimeRef = useRef<number>(0);
  const currentTorchStateRef = useRef<boolean>(initialMode === 'on' && enabled);

  useEffect(() => {
    let subscription: any = null;

    if (!enabled) {
      currentTorchStateRef.current = false;
      setTorchActive(false);
      return;
    }

    async function initLightSensor() {
      // El LightSensor solo existe nativamente en plataformas Android con sensor de hardware
      if (Platform.OS !== 'android') {
        setIsSensorAvailable(false);
        return;
      }

      try {
        const available = await LightSensor.isAvailableAsync();
        setIsSensorAvailable(available);

        if (available) {
          LightSensor.setUpdateInterval(APP_CONFIG.LIGHT_SENSOR.UPDATE_INTERVAL_MS);

          subscription = LightSensor.addListener((data) => {
            const lux = data.illuminance;
            setCurrentLux(lux);

            // Mantener ventana de hasta 4 lecturas recientes
            luxHistoryRef.current.push(lux);
            if (luxHistoryRef.current.length > 4) {
              luxHistoryRef.current.shift();
            }

            // Calcular promedio móvil
            const avgLux =
              luxHistoryRef.current.reduce((sum, val) => sum + val, 0) /
              luxHistoryRef.current.length;

            const now = Date.now();
            // Debounce de ~500 ms antes de alterar estado de antorcha
            if (now - lastChangeTimeRef.current < APP_CONFIG.LIGHT_SENSOR.DEBOUNCE_MS) {
              return;
            }

            // Lógica de histéresis:
            // - Si está apagado y la luz baja de 40 lux -> Enciende
            // - Si está encendido y la luz supera 60 lux -> Apaga
            if (!currentTorchStateRef.current && avgLux < APP_CONFIG.LIGHT_SENSOR.TORCH_ON_LUX) {
              currentTorchStateRef.current = true;
              lastChangeTimeRef.current = now;
              setTorchActive(true);
            } else if (
              currentTorchStateRef.current &&
              avgLux > APP_CONFIG.LIGHT_SENSOR.TORCH_OFF_LUX
            ) {
              currentTorchStateRef.current = false;
              lastChangeTimeRef.current = now;
              setTorchActive(false);
            }
          });
        }
      } catch (err) {
        console.warn('LightSensor no disponible o error al iniciar:', err);
        setIsSensorAvailable(false);
      }
    }

    initLightSensor();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enabled]);

  // Actualizar estado de torch según el modo seleccionado y si la pantalla está activa
  useEffect(() => {
    if (!enabled) {
      currentTorchStateRef.current = false;
      setTorchActive(false);
      return;
    }

    if (mode === 'on') {
      currentTorchStateRef.current = true;
      setTorchActive(true);
    } else if (mode === 'off') {
      currentTorchStateRef.current = false;
      setTorchActive(false);
    } else {
      // En modo 'auto', evaluar de inmediato si ya tenemos lectura
      if (currentLux !== null) {
        const shouldBeOn = currentLux < APP_CONFIG.LIGHT_SENSOR.TORCH_ON_LUX;
        currentTorchStateRef.current = shouldBeOn;
        setTorchActive(shouldBeOn);
      }
    }
  }, [mode, currentLux, enabled]);

  return {
    mode,
    setMode,
    currentLux,
    torchActive,
    isSensorAvailable,
  };
}

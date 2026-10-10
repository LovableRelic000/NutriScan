// Hook y servicio de seguimiento y acumulación de pasos diarios con Pedometer

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '@/core/utils';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { ActivityRepository } from '@/data/repositories/activityRepository';
import { APP_CONFIG } from '@/core/config';

export function useStepsTracker() {
  const { user, userDoc } = useAuthStore();
  const goal = userDoc?.goals?.daily_steps || APP_CONFIG.DEFAULT_GOALS.DAILY_STEPS;

  const [steps, setSteps] = useState<number>(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  const stepsRef = useRef<number>(0);
  const initialPedometerCountRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);
  const currentDateKeyRef = useRef<string>(getTodayDateString());

  // Cargar pasos acumulados desde AsyncStorage
  const loadStoredSteps = useCallback(async () => {
    const today = getTodayDateString();
    currentDateKeyRef.current = today;
    try {
      const stored = await AsyncStorage.getItem(`steps:${today}`);
      const initialCount = stored ? parseInt(stored, 10) : 0;
      setSteps(initialCount);
      stepsRef.current = initialCount;
    } catch (e) {
      console.warn('Error al leer pasos de AsyncStorage:', e);
    }
  }, []);

  // Guardar en AsyncStorage
  const saveStepsLocally = useCallback(async (count: number) => {
    const today = currentDateKeyRef.current;
    try {
      await AsyncStorage.setItem(`steps:${today}`, count.toString());
    } catch (e) {
      console.warn('Error al guardar pasos en AsyncStorage:', e);
    }
  }, []);

  // Sincronizar hacia Firestore si pasaron ~5 min o la app cambia de estado
  const syncToFirestore = useCallback(
    async (force: boolean = false) => {
      if (!user) return;
      const now = Date.now();
      if (!force && now - lastSyncTimeRef.current < APP_CONFIG.ACTIVITY_SYNC.INTERVAL_MS) {
        return;
      }

      const today = currentDateKeyRef.current;
      const currentCount = stepsRef.current;
      try {
        await ActivityRepository.syncActivity(user.uid, today, currentCount, goal);
        lastSyncTimeRef.current = now;
      } catch (e) {
        console.warn('Error al sincronizar actividad a Firestore:', e);
      }
    },
    [user, goal]
  );

  useEffect(() => {
    loadStoredSteps();

    let subscription: any = null;

    async function initPedometer() {
      try {
        const available = await Pedometer.isAvailableAsync();
        setIsPedometerAvailable(available);

        if (!available) return;

        const perm = await Pedometer.requestPermissionsAsync();
        setPermissionGranted(perm.granted);

        if (!perm.granted) return;

        // Iniciar suscripción a watchStepCount
        subscription = Pedometer.watchStepCount((result) => {
          const today = getTodayDateString();
          // Si cambió de fecha a medianoche mientras la app estaba abierta, reiniciar
          if (today !== currentDateKeyRef.current) {
            currentDateKeyRef.current = today;
            initialPedometerCountRef.current = result.steps;
            stepsRef.current = 0;
            setSteps(0);
            saveStepsLocally(0);
            return;
          }

          if (initialPedometerCountRef.current === null) {
            initialPedometerCountRef.current = result.steps;
            return;
          }

          const delta = result.steps - initialPedometerCountRef.current;
          if (delta > 0) {
            initialPedometerCountRef.current = result.steps;
            const updated = stepsRef.current + delta;
            stepsRef.current = updated;
            setSteps(updated);
            saveStepsLocally(updated);
            syncToFirestore(false);
          }
        });
      } catch (err) {
        console.warn('Error al iniciar Pedometer:', err);
      }
    }

    initPedometer();

    // Sincronizar al pasar la app a segundo plano o inactiva
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        syncToFirestore(true);
      } else if (nextState === 'active') {
        // Verificar si cambió el día
        loadStoredSteps();
      }
    });

    return () => {
      if (subscription) subscription.remove();
      appStateSub.remove();
      syncToFirestore(true);
    };
  }, [loadStoredSteps, saveStepsLocally, syncToFirestore]);

  // Permitir sumar pasos manualmente para pruebas o demos
  const addManualSteps = useCallback(
    (count: number) => {
      const updated = stepsRef.current + count;
      stepsRef.current = updated;
      setSteps(updated);
      saveStepsLocally(updated);
      syncToFirestore(true);
    },
    [saveStepsLocally, syncToFirestore]
  );

  return {
    steps,
    goal,
    isPedometerAvailable,
    permissionGranted,
    addManualSteps,
    syncToFirestore,
  };
}

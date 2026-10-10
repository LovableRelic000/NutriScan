// Hook para seguimiento de hidratación diaria en tiempo real con Firestore

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { WaterRepository } from '@/data/repositories/waterRepository';
import { WaterLogDocument } from '@/data/models/water';
import { getTodayDateString, calculatePercentage } from '@/core/utils';
import { APP_CONFIG } from '@/core/config';

export function useWaterTracker() {
  const { user, userDoc } = useAuthStore();
  const goalMl = userDoc?.goals?.daily_water_ml || APP_CONFIG.DEFAULT_GOALS.DAILY_WATER_ML;

  const [waterLog, setWaterLog] = useState<WaterLogDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const today = getTodayDateString();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = WaterRepository.subscribeWaterLog(
      user.uid,
      today,
      (log) => {
        setWaterLog(log);
        setLoading(false);
      },
      (err) => {
        console.warn('Error al escuchar registro de agua:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, today]);

  const addWater = useCallback(
    async (ml: number) => {
      if (!user) return;
      try {
        setActionLoading(true);
        await WaterRepository.addWater(user.uid, today, ml, goalMl);
      } catch (e) {
        console.error('Error al agregar agua:', e);
      } finally {
        setActionLoading(false);
      }
    },
    [user, today, goalMl]
  );

  const undoLast = useCallback(async () => {
    if (!user) return false;
    try {
      setActionLoading(true);
      return await WaterRepository.undoLastWater(user.uid, today);
    } catch (e) {
      console.error('Error al deshacer registro de agua:', e);
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [user, today]);

  const totalMl = waterLog?.total_ml || 0;
  const percentage = calculatePercentage(totalMl, goalMl);
  const entriesCount = waterLog?.entries?.length || 0;

  return {
    totalMl,
    goalMl,
    percentage,
    entriesCount,
    loading,
    actionLoading,
    addWater,
    undoLast,
  };
}

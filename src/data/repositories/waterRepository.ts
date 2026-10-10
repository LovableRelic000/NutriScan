// Repositorio de registro de agua (Firestore subcolección)

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  arrayUnion,
  runTransaction,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, waterLogConverter } from '../firebase';
import { WaterLogDocument, WaterLogEntry } from '../models/water';
import { APP_CONFIG } from '@/core/config';

export class WaterRepository {
  private static getDocRef(uid: string, date: string) {
    return doc(db, 'users', uid, 'water_logs', date).withConverter(waterLogConverter);
  }

  static async getWaterLog(uid: string, date: string): Promise<WaterLogDocument | null> {
    const snap = await getDoc(this.getDocRef(uid, date));
    return snap.exists() ? snap.data() : null;
  }

  /**
   * Agrega cantidad de agua consumida.
   * Usa increment() para total_ml y arrayUnion con Timestamp.now() del cliente
   * ya que serverTimestamp() no es soportado dentro de arrays en Firestore.
   */
  static async addWater(uid: string, date: string, ml: number, goalMl: number = APP_CONFIG.DEFAULT_GOALS.DAILY_WATER_ML): Promise<void> {
    const ref = this.getDocRef(uid, date);
    const snap = await getDoc(ref);
    const newEntry: WaterLogEntry = {
      ml,
      at: Timestamp.now(),
    };

    if (!snap.exists()) {
      const initialLog: WaterLogDocument = {
        date,
        total_ml: ml,
        goal_ml: goalMl,
        entries: [newEntry],
      };
      await setDoc(ref, initialLog);
    } else {
      await updateDoc(ref, {
        total_ml: increment(ml),
        entries: arrayUnion(newEntry),
      });
    }
  }

  /**
   * Deshace la última entrada registrada del día mediante una transacción atómica.
   */
  static async undoLastWater(uid: string, date: string): Promise<boolean> {
    const ref = this.getDocRef(uid, date);

    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return false;

      const data = snap.data();
      if (!data.entries || data.entries.length === 0) return false;

      const entries = [...data.entries];
      const removed = entries.pop();
      const removedMl = removed ? removed.ml : 0;
      const newTotal = Math.max(0, data.total_ml - removedMl);

      transaction.update(ref, {
        total_ml: newTotal,
        entries,
      });

      return true;
    });
  }

  static subscribeWaterLog(
    uid: string,
    date: string,
    onUpdate: (log: WaterLogDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      this.getDocRef(uid, date),
      (snap) => {
        onUpdate(snap.exists() ? snap.data() : null);
      },
      (error) => {
        console.error('Error en listener de water_logs:', error);
        if (onError) onError(error);
      }
    );
  }
}

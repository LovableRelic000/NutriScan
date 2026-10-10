// Repositorio de actividad diaria / pasos (Firestore subcolección)

import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, activityConverter } from '../firebase';
import { DailyActivityDocument } from '../models/activity';
import { APP_CONFIG } from '@/core/config';

export class ActivityRepository {
  private static getDocRef(uid: string, date: string) {
    return doc(db, 'users', uid, 'daily_activity', date).withConverter(activityConverter);
  }

  static async getActivity(uid: string, date: string): Promise<DailyActivityDocument | null> {
    const snap = await getDoc(this.getDocRef(uid, date));
    return snap.exists() ? snap.data() : null;
  }

  /**
   * Sincroniza los pasos acumulados hacia Firestore.
   * Se invoca periódicamente (cada ~5 min) o al pasar la app a segundo plano,
   * optimizando la cuota gratuita del plan Spark.
   */
  static async syncActivity(
    uid: string,
    date: string,
    steps: number,
    goal: number = APP_CONFIG.DEFAULT_GOALS.DAILY_STEPS
  ): Promise<void> {
    const ref = this.getDocRef(uid, date);
    const activityData: DailyActivityDocument = {
      steps,
      goal,
      last_sync: Timestamp.now(),
    };
    await setDoc(ref, activityData, { merge: true });
  }

  static subscribeActivity(
    uid: string,
    date: string,
    onUpdate: (activity: DailyActivityDocument | null) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    return onSnapshot(
      this.getDocRef(uid, date),
      (snap) => {
        onUpdate(snap.exists() ? snap.data() : null);
      },
      (error) => {
        console.error('Error en listener de daily_activity:', error);
        if (onError) onError(error);
      }
    );
  }
}

// Repositorio de usuario (Firestore)

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db, userConverter } from '../firebase';
import { UserDocument, HealthProfile, UserGoals, UserSettings } from '../models/user';
import { APP_CONFIG } from '@/core/config';

export class UserRepository {
  private static getUserRef(uid: string) {
    return doc(db, 'users', uid).withConverter(userConverter);
  }

  static async getUser(uid: string): Promise<UserDocument | null> {
    const snap = await getDoc(this.getUserRef(uid));
    return snap.exists() ? snap.data() : null;
  }

  static async createInitialUser(uid: string, displayName: string = 'Usuario', isAnonymous: boolean = true): Promise<UserDocument> {
    const initialUser: UserDocument = {
      display_name: displayName,
      created_at: Timestamp.now(),
      is_anonymous: isAnonymous,
      is_pro: false,
      pro_since: null,
      health_profile: {
        allergies: [],
        lifestyles: [],
        custom_avoid: [],
      },
      goals: {
        daily_steps: APP_CONFIG.DEFAULT_GOALS.DAILY_STEPS,
        daily_water_ml: APP_CONFIG.DEFAULT_GOALS.DAILY_WATER_ML,
      },
      settings: {
        water_reminders: {
          enabled: true,
          start_hour: 8,
          end_hour: 22,
          interval_min: 120,
        },
        inactivity_alert: true,
        biometric_lock_profile: false,
      },
    };

    await setDoc(this.getUserRef(uid), initialUser);
    return initialUser;
  }

  static async updateHealthProfile(uid: string, healthProfile: HealthProfile): Promise<void> {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, {
      health_profile: healthProfile,
    });
  }

  static async updateGoals(uid: string, goals: Partial<UserGoals>): Promise<void> {
    const ref = doc(db, 'users', uid);
    const updates: Record<string, any> = {};
    if (goals.daily_steps !== undefined) updates['goals.daily_steps'] = goals.daily_steps;
    if (goals.daily_water_ml !== undefined) updates['goals.daily_water_ml'] = goals.daily_water_ml;
    await updateDoc(ref, updates);
  }

  static async updateSettings(uid: string, settings: Partial<UserSettings>): Promise<void> {
    const ref = doc(db, 'users', uid);
    const updates: Record<string, any> = {};
    if (settings.inactivity_alert !== undefined) {
      updates['settings.inactivity_alert'] = settings.inactivity_alert;
    }
    if (settings.biometric_lock_profile !== undefined) {
      updates['settings.biometric_lock_profile'] = settings.biometric_lock_profile;
    }
    if (settings.water_reminders) {
      if (settings.water_reminders.enabled !== undefined) {
        updates['settings.water_reminders.enabled'] = settings.water_reminders.enabled;
      }
      if (settings.water_reminders.start_hour !== undefined) {
        updates['settings.water_reminders.start_hour'] = settings.water_reminders.start_hour;
      }
      if (settings.water_reminders.end_hour !== undefined) {
        updates['settings.water_reminders.end_hour'] = settings.water_reminders.end_hour;
      }
      if (settings.water_reminders.interval_min !== undefined) {
        updates['settings.water_reminders.interval_min'] = settings.water_reminders.interval_min;
      }
    }
    await updateDoc(ref, updates);
  }

  static async updateProStatus(uid: string, isPro: boolean): Promise<void> {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, {
      is_pro: isPro,
      pro_since: isPro ? serverTimestamp() : null,
    });
  }

  static subscribeUser(uid: string, onUpdate: (user: UserDocument | null) => void, onError?: (err: Error) => void): Unsubscribe {
    return onSnapshot(
      this.getUserRef(uid),
      (docSnap) => {
        onUpdate(docSnap.exists() ? docSnap.data() : null);
      },
      (error) => {
        console.error('Error en listener de usuario:', error);
        if (onError) onError(error);
      }
    );
  }
}

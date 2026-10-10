import { Timestamp } from 'firebase/firestore';
import { CanonicalAllergy, CanonicalLifestyle } from '@/core/constants';

export interface HealthProfile {
  allergies: CanonicalAllergy[];
  lifestyles: CanonicalLifestyle[];
  custom_avoid: string[];
}

export interface UserGoals {
  daily_steps: number;
  daily_water_ml: number;
}

export interface WaterReminderSettings {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  interval_min: number;
}

export interface UserSettings {
  water_reminders: WaterReminderSettings;
  inactivity_alert: boolean;
  biometric_lock_profile: boolean;
}

export interface UserDocument {
  display_name: string;
  created_at: Timestamp;
  is_anonymous: boolean;
  is_pro: boolean;
  pro_since: Timestamp | null;
  health_profile: HealthProfile;
  goals: UserGoals;
  settings: UserSettings;
}

import { Timestamp } from 'firebase/firestore';

export interface WaterLogEntry {
  ml: number;
  at: Timestamp;
}

export interface WaterLogDocument {
  date: string; // yyyy-MM-dd
  total_ml: number;
  goal_ml: number;
  entries: WaterLogEntry[];
}

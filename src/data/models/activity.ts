import { Timestamp } from 'firebase/firestore';

export interface DailyActivityDocument {
  steps: number;
  goal: number;
  last_sync: Timestamp;
}

import { Timestamp } from 'firebase/firestore';
import { ScanStatusType } from '@/core/constants';

export interface ScanFlag {
  ingredient: string;
  rule_id: string;
  profile_trigger: string;
  category: 'allergen' | 'lifestyle' | 'trace';
  severity: 'danger' | 'caution';
  reason: string;
}

export interface ScanDocument {
  id?: string;
  created_at: Timestamp;
  status: ScanStatusType;
  product_name: string | null;
  raw_text: string;
  ingredient_section_found: boolean;
  flags: ScanFlag[];
  lux_at_scan: number | null;
  flash_used: boolean;
}

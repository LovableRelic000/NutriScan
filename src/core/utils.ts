// Utilidades generales para fechas, formato y cadenas

import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Obtiene la clave de fecha en formato YYYY-MM-DD para documentos de Firestore
 */
export function getTodayDateString(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Formatea una fecha ISO o Date a formato legible en español
 */
export function formatDisplayDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return format(date, "d 'de' MMMM, yyyy", { locale: es });
}

/**
 * Formatea hora a formato legible 12h (ej: 04:30 PM)
 */
export function formatDisplayTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  return format(date, 'hh:mm a', { locale: es });
}

/**
 * Calcula porcentaje acotado entre 0 y 100
 */
export function calculatePercentage(current: number, goal: number): number {
  if (goal <= 0) return 0;
  const ratio = (current / goal) * 100;
  return Math.min(100, Math.max(0, Math.round(ratio)));
}

// Sistema de diseño y tokens de tema para NutriScan AI

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  safe: string;
  caution: string;
  danger: string;
  unverified: string;
  white: string;
  black: string;
  overlay: string;
  accent: string;
  water: string;
  steps: string;
}

export const lightColors: ThemeColors = {
  primary: '#10B981', // Esmeralda fresco
  primaryLight: '#D1FAE5',
  primaryDark: '#047857',
  secondary: '#0EA5E9', // Azul cielo
  background: '#F8FAFC', // Slate 50
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9', // Slate 100
  card: '#FFFFFF',
  border: '#E2E8F0', // Slate 200
  text: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  safe: '#10B981', // Verde esmeralda
  caution: '#F59E0B', // Ámbar
  danger: '#EF4444', // Rojo coral
  unverified: '#64748B', // Pizarra
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(15, 23, 42, 0.6)',
  accent: '#8B5CF6', // Violeta Pro
  water: '#0284C7', // Azul agua
  steps: '#F97316', // Naranja actividad
};

export const darkColors: ThemeColors = {
  primary: '#34D399', // Esmeralda suave
  primaryLight: '#064E3B',
  primaryDark: '#059669',
  secondary: '#38BDF8',
  background: '#0B1120', // Slate 950 muy profundo
  surface: '#1E293B', // Slate 800
  surfaceVariant: '#334155', // Slate 700
  card: '#1E293B',
  border: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#64748B',
  safe: '#34D399',
  caution: '#FBBF24',
  danger: '#F87171',
  unverified: '#94A3B8',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.75)',
  accent: '#A78BFA',
  water: '#38BDF8',
  steps: '#FB923C',
};

// Exportación por defecto para hojas de estilo estáticas
export const colors: ThemeColors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

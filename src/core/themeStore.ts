// Gestor de Estado Global para Tema (Claro / Oscuro) con persistencia en AsyncStorage
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, lightColors, darkColors } from './theme';

const STORAGE_KEY = 'nutriscan_theme_mode';

interface ThemeState {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => Promise<void>;
  setTheme: (isDark: boolean) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: false,
  colors: lightColors,

  toggleTheme: async () => {
    const nextIsDark = !get().isDark;
    set({
      isDark: nextIsDark,
      colors: nextIsDark ? darkColors : lightColors,
    });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextIsDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Error al guardar tema en AsyncStorage:', e);
    }
  },

  setTheme: async (isDark: boolean) => {
    set({
      isDark,
      colors: isDark ? darkColors : lightColors,
    });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('Error al guardar tema en AsyncStorage:', e);
    }
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'dark') {
        set({ isDark: true, colors: darkColors });
      } else if (saved === 'light') {
        set({ isDark: false, colors: lightColors });
      }
    } catch (e) {
      console.warn('Error al recuperar tema de AsyncStorage:', e);
    }
  },
}));

/**
 * Hook de conveniencia para consumir el tema en cualquier pantalla o componente
 */
export function useTheme() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return { isDark, colors, toggleTheme, setTheme };
}

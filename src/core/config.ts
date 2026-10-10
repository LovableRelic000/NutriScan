// Configuración global y variables de entorno para NutriScan AI

export const APP_CONFIG = {
  // Modelo de Gemini para el Asistente Pro
  // gemini-3.5-flash-lite: modelo oficial de alto rendimiento, cuota gratuita y ultra-baja latencia
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  
  // Parámetros y límites de costo para el Chat
  CHAT_LIMITS: {
    MAX_HISTORY_TURNS: 12,
    MAX_OUTPUT_TOKENS: 600,
    TEMPERATURE: 0.6,
    MAX_SESSION_MESSAGES: 30,
    REQUEST_TIMEOUT_MS: 20000,
  },

  // Metas por defecto
  DEFAULT_GOALS: {
    DAILY_STEPS: 8000,
    DAILY_WATER_ML: 2000,
  },

  // Umbrales de sensor de luz para auto-flash (lux)
  LIGHT_SENSOR: {
    TORCH_ON_LUX: 40,
    TORCH_OFF_LUX: 60,
    UPDATE_INTERVAL_MS: 300,
    DEBOUNCE_MS: 500,
  },

  // Configuración de sincronización de pasos a Firestore
  ACTIVITY_SYNC: {
    INTERVAL_MS: 5 * 60 * 1000, // Cada 5 minutos
  },
} as const;

// Variables de entorno de Firebase
export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

// Clave API de Gemini
export const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

// Inicialización y configuración de Firebase (Modular JS SDK)
// Compatible con Expo Go y Development Build

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  Auth,
  getAuth,
} from 'firebase/auth';
// @ts-ignore - Exported by firebase/auth React Native entrypoint (dist/rn/index.js)
import { getReactNativePersistence } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FIREBASE_CONFIG } from '@/core/config';
import { UserDocument } from './models/user';
import { ScanDocument } from './models/scan';
import { WaterLogDocument } from './models/water';
import { DailyActivityDocument } from './models/activity';

/**
 * Inicialización de Firebase App
 */
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(FIREBASE_CONFIG);
} else {
  app = getApp();
}

/**
 * Inicialización de Firebase Auth con persistencia en AsyncStorage
 * Permite mantener la sesión del usuario (anónimo o con credenciales) entre reinicios de la app.
 */
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch (e) {
  // Si ya estaba inicializado (por ejemplo en hot reload de Expo)
  auth = getAuth(app);
}

/**
 * Inicialización de Cloud Firestore
 *
 * NOTA DE ARQUITECTURA:
 * 1. Se utiliza experimentalAutoDetectLongPolling: true para evitar caídas
 *    frecuentes de WebSocket en dispositivos móviles y redes celulares.
 * 2. En React Native con el SDK Web de Firebase, la persistencia offline de
 *    Firestore es en memoria (memoryPersistence). Las escrituras pendientes se
 *    sincronizan mientras el ciclo de vida del proceso esté activo.
 */
let db: Firestore;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch (e) {
  db = getFirestore(app);
}

export { app, auth, db };

/**
 * Conversores tipados (Firestore withConverter) para garantizar tipado estricto
 */
export const userConverter = {
  toFirestore: (data: UserDocument) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): UserDocument => {
    return snapshot.data(options) as UserDocument;
  },
};

export const scanConverter = {
  toFirestore: (data: ScanDocument) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): ScanDocument => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      ...data,
    } as ScanDocument;
  },
};

export const waterLogConverter = {
  toFirestore: (data: WaterLogDocument) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): WaterLogDocument => {
    return snapshot.data(options) as WaterLogDocument;
  },
};

export const activityConverter = {
  toFirestore: (data: DailyActivityDocument) => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): DailyActivityDocument => {
    return snapshot.data(options) as DailyActivityDocument;
  },
};

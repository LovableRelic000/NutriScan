// Store global de Zustand para autenticación y estado del usuario

import { create } from 'zustand';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInAnonymously,
  signOut as fbSignOut,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/data/firebase';
import { UserRepository } from '@/data/repositories/userRepository';
import { UserDocument, HealthProfile, UserGoals, UserSettings } from '@/data/models/user';

interface AuthState {
  user: FirebaseUser | null;
  userDoc: UserDocument | null;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  isPro: boolean;

  // Acciones
  initAuthListener: () => () => void;
  ensureAnonymousAuth: () => Promise<void>;
  updateHealthProfile: (profile: HealthProfile) => Promise<void>;
  updateGoals: (goals: Partial<UserGoals>) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setProStatus: (isPro: boolean) => Promise<void>;
  linkWithEmailPassword: (email: string, pass: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userDoc: null,
  isLoading: false,
  isInitializing: true,
  error: null,
  isPro: false,

  initAuthListener: () => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      set({ user: firebaseUser, error: null });

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        // Suscribirse a los cambios en tiempo real del documento de usuario
        unsubscribeUserDoc = UserRepository.subscribeUser(
          firebaseUser.uid,
          async (docData) => {
            if (!docData) {
              // Si no existe aún el documento, crearlo con valores iniciales
              const newDoc = await UserRepository.createInitialUser(
                firebaseUser.uid,
                firebaseUser.displayName || (firebaseUser.isAnonymous ? 'Invitado' : 'Usuario'),
                firebaseUser.isAnonymous
              );
              set({ userDoc: newDoc, isPro: false, isInitializing: false });
            } else {
              set({ userDoc: docData, isPro: docData.is_pro ?? false, isInitializing: false });
            }
          },
          (err) => {
            console.error('Error al escuchar el perfil del usuario:', err);
            set({ isInitializing: false });
          }
        );
      } else {
        // No hay usuario logueado todavía
        set({ user: null, userDoc: null, isPro: false, isInitializing: false });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  },

  ensureAnonymousAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (err: any) {
      console.error('Fallo en login anónimo:', err);
      set({ error: err.message || 'Error al iniciar sesión de invitado' });
    } finally {
      set({ isLoading: false, isInitializing: false });
    }
  },

  updateHealthProfile: async (profile: HealthProfile) => {
    const { user, userDoc } = get();
    if (!user) return;
    try {
      set({ isLoading: true });
      await UserRepository.updateHealthProfile(user.uid, profile);
      if (userDoc) {
        set({ userDoc: { ...userDoc, health_profile: profile } });
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  updateGoals: async (goals: Partial<UserGoals>) => {
    const { user, userDoc } = get();
    if (!user) return;
    try {
      await UserRepository.updateGoals(user.uid, goals);
      if (userDoc) {
        set({ userDoc: { ...userDoc, goals: { ...userDoc.goals, ...goals } } });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateSettings: async (settings: Partial<UserSettings>) => {
    const { user, userDoc } = get();
    if (!user) return;
    try {
      await UserRepository.updateSettings(user.uid, settings);
      if (userDoc) {
        set({ userDoc: { ...userDoc, settings: { ...userDoc.settings, ...settings } } });
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  setProStatus: async (isPro: boolean) => {
    const { user, userDoc } = get();
    if (!user) return;
    try {
      await UserRepository.updateProStatus(user.uid, isPro);
      set({ isPro });
      if (userDoc) {
        set({ userDoc: { ...userDoc, is_pro: isPro } });
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    }
  },

  linkWithEmailPassword: async (email: string, pass: string) => {
    const { user } = get();
    if (!user) throw new Error('No hay sesión activa para vincular');
    try {
      set({ isLoading: true, error: null });
      const credential = EmailAuthProvider.credential(email, pass);
      const userCred = await linkWithCredential(user, credential);
      set({ user: userCred.user });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithEmail: async (email: string, pass: string) => {
    try {
      set({ isLoading: true, error: null });
      const userCred = await signInWithEmailAndPassword(auth, email, pass);
      set({ user: userCred.user });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signUpWithEmail: async (email: string, pass: string, displayName?: string) => {
    try {
      set({ isLoading: true, error: null });
      const userCred = await createUserWithEmailAndPassword(auth, email, pass);
      await UserRepository.createInitialUser(userCred.user.uid, displayName || 'Usuario', false);
      set({ user: userCred.user });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true });
      await fbSignOut(auth);
      set({ user: null, userDoc: null, isPro: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));

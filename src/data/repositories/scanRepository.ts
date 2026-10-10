// Repositorio de historial de escaneo (Firestore subcolección)

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, scanConverter } from '../firebase';
import { ScanDocument } from '../models/scan';

export class ScanRepository {
  private static getCollectionRef(uid: string) {
    return collection(db, 'users', uid, 'scan_history').withConverter(scanConverter);
  }

  static async addScan(uid: string, scanData: Omit<ScanDocument, 'id'>): Promise<string> {
    const docRef = await addDoc(this.getCollectionRef(uid), scanData as ScanDocument);
    return docRef.id;
  }

  static async getRecentScans(uid: string, limitCount: number = 20): Promise<ScanDocument[]> {
    const q = query(
      this.getCollectionRef(uid),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  }

  static subscribeRecentScans(
    uid: string,
    limitCount: number = 20,
    onUpdate: (scans: ScanDocument[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    const q = query(
      this.getCollectionRef(uid),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (querySnap) => {
        const scans = querySnap.docs.map((d) => d.data());
        onUpdate(scans);
      },
      (error) => {
        console.error('Error en listener de scan_history:', error);
        if (onError) onError(error);
      }
    );
  }

  static async deleteScan(uid: string, scanId: string): Promise<void> {
    const docRef = doc(db, 'users', uid, 'scan_history', scanId);
    await deleteDoc(docRef);
  }
}

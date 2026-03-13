import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp, 
  runTransaction, 
  doc, 
  getDoc,
  where
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { InspectionReport } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const reportService = {
  async getNextProtocol(clientName: string): Promise<string> {
    const counterRef = doc(db, 'counters', 'reports');
    
    try {
      return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextNum = 1;
        
        if (counterDoc.exists()) {
          nextNum = counterDoc.data().current + 1;
        }
        
        transaction.set(counterRef, { current: nextNum });
        
        const paddedNum = String(nextNum).padStart(5, '0');
        return `${paddedNum} - ${clientName}`;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'counters/reports');
      return ''; // unreachable
    }
  },

  async uploadPhoto(dataUrl: string, protocol: string, photoIndex: number): Promise<string> {
    const photoRef = ref(storage, `reports/${protocol}/photo_${photoIndex}.jpg`);
    await uploadString(photoRef, dataUrl, 'data_url');
    return await getDownloadURL(photoRef);
  },

  async saveReport(report: Omit<InspectionReport, 'id' | 'createdAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...report,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
      return ''; // unreachable
    }
  },

  async getReports(userId: string): Promise<InspectionReport[]> {
    try {
      const q = query(
        collection(db, 'reports'),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InspectionReport));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reports');
      return []; // unreachable
    }
  },

  async getCurrentIp(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching IP:', error);
      return '';
    }
  },

  async isIpAuthorized(ip: string): Promise<boolean> {
    try {
      const q = query(collection(db, 'authorizedIPs'), where('ip', '==', ip));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Update last used
        const docId = querySnapshot.docs[0].id;
        await this.updateLastUsed(docId);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking IP authorization:', error);
      return false;
    }
  },

  async updateLastUsed(docId: string): Promise<void> {
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'authorizedIPs', docId), {
        lastUsed: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last used:', error);
    }
  },

  async registerIp(ip: string, registeredBy: string, phoneNumber?: string): Promise<void> {
    try {
      await addDoc(collection(db, 'authorizedIPs'), {
        ip,
        phoneNumber: phoneNumber || '',
        registeredAt: serverTimestamp(),
        registeredBy,
        lastUsed: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'authorizedIPs');
    }
  },

  async getAllAuthorizedIPs(): Promise<any[]> {
    try {
      const q = query(collection(db, 'authorizedIPs'), orderBy('registeredAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'authorizedIPs');
      return [];
    }
  },

  async deleteAuthorizedIp(id: string): Promise<void> {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'authorizedIPs', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'authorizedIPs');
    }
  }
};

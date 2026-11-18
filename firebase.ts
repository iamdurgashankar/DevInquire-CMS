import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore, setLogLevel, disableNetwork, terminate } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Silence noisy internal @firebase/firestore GrpcConnection/WebChannel retry logs when running in fallback/demo mode
try {
  setLogLevel('silent');
} catch {
  // ignore
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const isFirestoreConfigured = Boolean(
  firebaseConfig?.projectId && firebaseConfig.projectId !== 'devinquire-cms'
);

let firestoreTerminated = false;
export const disableFirestoreNetwork = async () => {
  if (firestoreTerminated) return;
  firestoreTerminated = true;
  try {
    await disableNetwork(db);
  } catch {
    // ignore
  }
  try {
    await terminate(db);
  } catch {
    // ignore
  }
};

if (!isFirestoreConfigured) {
  disableFirestoreNetwork();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes('Permission denied on resource project') ||
    msg.includes('API key not valid') ||
    msg.includes('api-key-not-valid')
  ) {
    disableFirestoreNetwork();
    return;
  }

  // Ignore benign Firestore errors related to idle streams, offline fallback, or manual cancellations
  if (
    msg.includes('CANCELLED') || 
    msg.includes('Disconnecting idle stream') ||
    msg.includes('stream error. Code: 1') ||
    msg.includes('offline') ||
    msg.includes('permission-denied') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('Missing or insufficient permissions')
  ) {
    return;
  }

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
  };
  console.warn('Firestore sync fallback:', JSON.stringify(errInfo));
}

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const signupWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const logout = () => signOut(auth);

export { updateProfile };

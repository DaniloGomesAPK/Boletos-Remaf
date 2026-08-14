import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';

import firebaseConfigJson from '../../firebase-applet-config.json';

// Firebase SDK Initialization with Environment Variables (VITE_FIREBASE_...)
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseConfigJson as Record<string, string>)?.projectId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (firebaseConfigJson as Record<string, string>)?.appId || '',
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (firebaseConfigJson as Record<string, string>)?.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfigJson as Record<string, string>)?.authDomain || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || (firebaseConfigJson as Record<string, string>)?.firestoreDatabaseId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfigJson as Record<string, string>)?.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfigJson as Record<string, string>)?.messagingSenderId || '',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);

// Initialize Firestore (handles custom database ID if defined in VITE_FIREBASE_DATABASE_ID, otherwise uses default)
const customDatabaseId = firebaseConfig.firestoreDatabaseId;
export const db: Firestore =
  customDatabaseId && customDatabaseId !== '(default)' && customDatabaseId !== 'undefined'
    ? getFirestore(app, customDatabaseId)
    : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  onSnapshot,
};

export type { User };

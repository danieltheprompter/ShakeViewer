/* Firebase is loaded only when Sign in (or another auth action) is opened. */

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBp5fLaKF2KOmaGDU1b7jLLw7rJ9dt1f9Q",
  authDomain: "shakeviewer-5f151.firebaseapp.com",
  projectId: "shakeviewer-5f151",
  storageBucket: "shakeviewer-5f151.firebasestorage.app",
  messagingSenderId: "893473886940",
  appId: "1:893473886940:web:44fa50778d9b2f92bb5a19",
};

let loading = null;
let cached = null;

export function getFirebase() {
  return cached;
}

export async function loadFirebase() {
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);
    cached = {
      app,
      auth,
      db,
      GoogleAuthProvider: authMod.GoogleAuthProvider,
      EmailAuthProvider: authMod.EmailAuthProvider,
      signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
      createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
      signInWithPopup: authMod.signInWithPopup,
      sendPasswordResetEmail: authMod.sendPasswordResetEmail,
      signOut: authMod.signOut,
      onAuthStateChanged: authMod.onAuthStateChanged,
      updateProfile: authMod.updateProfile,
      updatePassword: authMod.updatePassword,
      reauthenticateWithCredential: authMod.reauthenticateWithCredential,
      deleteUser: authMod.deleteUser,
      collection: fsMod.collection,
      doc: fsMod.doc,
      getDoc: fsMod.getDoc,
      setDoc: fsMod.setDoc,
      addDoc: fsMod.addDoc,
      updateDoc: fsMod.updateDoc,
      deleteDoc: fsMod.deleteDoc,
      getDocs: fsMod.getDocs,
      onSnapshot: fsMod.onSnapshot,
      query: fsMod.query,
      orderBy: fsMod.orderBy,
      writeBatch: fsMod.writeBatch,
      serverTimestamp: fsMod.serverTimestamp,
    };
    return cached;
  })();
  try {
    return await loading;
  } catch (e) {
    loading = null;
    console.warn('[ShakeViewer] Firebase failed to load:', e);
    throw e;
  }
}

const FRIENDLY = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found for that email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account already exists for that email.',
  'auth/weak-password': 'Password must be at least 8 characters.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/requires-recent-login': 'Please sign in again to continue.',
};

export function friendlyAuthError(err) {
  const code = err?.code || '';
  if (FRIENDLY[code]) return FRIENDLY[code];
  const msg = String(err?.message || '');
  if (msg && !msg.includes('Firebase') && !msg.includes('auth/')) return msg;
  return 'Something went wrong. Please try again.';
}

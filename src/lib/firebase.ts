import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, type User, signOut } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, deleteDoc, getDocs, query, orderBy, getDocFromServer 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Test Firestore connection on boot
export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'public_files', 'test-connection'));
    console.log('Koneksi Firestore Berhasil');
  } catch (error) {
    console.log('Info: Koneksi awal Firestore tertunda atau memerlukan otentikasi jika offline.', error);
  }
};
testConnection();

const provider = new GoogleAuthProvider();
// Enable OAuth scopes for Google Drive
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');

// Force Google Drive to return a refresh token during OAuth if needed
provider.setCustomParameters({
  prompt: 'select_account'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedIdToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Since Firebase persistent state might maintain user login but not Google access tokens,
        // we might need to prompt a signin or retrieve the token.
        // During active browser session, if token is not cached, the app should request login.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google OAuth');
    }

    cachedAccessToken = credential.accessToken;
    if (credential.idToken) {
      cachedIdToken = credential.idToken;
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedIdToken = null;
};

/**
 * Menyimpan metadata file yang diunggah ke Firestore di bawah koleksi 'public_files'.
 */
export const savePublicFile = async (fileData: {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  createdTime: string;
  uploadedBy: string;
  parentFolderId?: string | null;
}): Promise<void> => {
  try {
    const fileRef = doc(db, 'public_files', fileData.id);
    await setDoc(fileRef, {
      ...fileData,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving public file to Firestore:', error);
    throw error;
  }
};

/**
 * Menghapus metadata file dari koleksi 'public_files' di Firestore.
 */
export const deletePublicFile = async (fileId: string): Promise<void> => {
  try {
    const fileRef = doc(db, 'public_files', fileId);
    await deleteDoc(fileRef);
  } catch (error) {
    console.error('Error deleting public file from Firestore:', error);
    throw error;
  }
};

/**
 * Mengambil semua file publik dari Firestore, diurutkan berdasarkan waktu unggah terbaru.
 */
export const fetchPublicFiles = async (): Promise<any[]> => {
  try {
    const q = query(collection(db, 'public_files'), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const filesList: any[] = [];
    querySnapshot.forEach((documentRef) => {
      filesList.push({ ...documentRef.data() });
    });
    return filesList;
  } catch (error) {
    console.error('Error fetching public files from Firestore:', error);
    throw error;
  }
};

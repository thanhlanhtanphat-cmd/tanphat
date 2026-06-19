import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';

const app: FirebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'consent'
});

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Helper to check if the session-stored Google OAuth token has expired (older than 55 minutes)
const isTokenExpired = (): boolean => {
  try {
    const savedTimeStr = sessionStorage.getItem('google_drive_token_time');
    if (!savedTimeStr) return false;
    const savedTime = parseInt(savedTimeStr, 10);
    const ageMs = Date.now() - savedTime;
    return ageMs > 55 * 60 * 1000; // 55 minutes (expiring 5 mins early to avoid race conditions)
  } catch (e) {
    return false;
  }
};

// Try to load token from session storage (less persistent than local storage, but survives refresh)
try {
  cachedAccessToken = sessionStorage.getItem('google_drive_access_token');
  if (cachedAccessToken && isTokenExpired()) {
    cachedAccessToken = null;
    sessionStorage.removeItem('google_drive_access_token');
    sessionStorage.removeItem('google_drive_token_time');
  }
} catch (e) {
  console.warn('Could not access session storage for token');
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken && !isTokenExpired()) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // User is logged into Firebase but we don't have a valid/fresh Google token
        // We call onAuthFailure to let the UI know it needs to request auth specifically for Drive
        clearAccessToken();
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      clearAccessToken();
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google. Please ensure you granted Google Drive permissions.');
    }

    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('google_drive_access_token', cachedAccessToken);
      sessionStorage.setItem('google_drive_token_time', Date.now().toString());
    } catch (e) {
      console.warn('Could not save token to session storage');
    }
    
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Google Sign-In is not enabled in your Firebase project. Please enable it in the Firebase Console.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error(`This domain (${window.location.hostname}) is not authorized for Firebase Auth. Please add it to "Authorized Domains" in the Firebase Console.`);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken && isTokenExpired()) {
    clearAccessToken();
  }
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('google_drive_access_token');
    sessionStorage.removeItem('google_drive_token_time');
  } catch (e) {
    console.warn('Could not remove google_drive_access_token from sessionStorage');
  }
};

export const logout = async () => {
  await auth.signOut();
  clearAccessToken();
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import { HeritageSite, UserState } from '../types';
import { DEFAULT_HERITAGE_SITES } from '../data/defaultSites';

// Import the config statically
import rawConfig from '../../firebase-applet-config.json';

// Check if credentials are set (not empty strings)
export const isFirebaseConfigured = !!(rawConfig && rawConfig.apiKey && rawConfig.apiKey !== "");

let app;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(rawConfig) : getApp();
    db = getFirestore(app, rawConfig.firestoreDatabaseId);
    auth = getAuth(app);

    // Mandated: Test connection on startup using getDocFromServer
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration: Client appears to be offline.");
        }
      }
    };
    testConnection();
  } catch (err) {
    console.warn("Failed to initialize Firebase SDK:", err);
  }
}

export { db, auth };

// ---- Skill Handlers for Firestore Error Formatting ----
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
      providerInfo: currentAuth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Info: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// LOCAL STORAGE FALLBACK LAYER FOR IMMEDIATE TESTING WITHOUT CLOUD CHARGES
const LOCAL_STORAGE_SITES_KEY = 'heritage_explorer_sites';
const LOCAL_STORAGE_USER_KEY = 'heritage_explorer_user';

const getLocalStorageSites = (): HeritageSite[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_SITES_KEY);
  if (!stored) {
    localStorage.setItem(LOCAL_STORAGE_SITES_KEY, JSON.stringify(DEFAULT_HERITAGE_SITES));
    return DEFAULT_HERITAGE_SITES;
  }
  try {
    const list = JSON.parse(stored) as HeritageSite[];
    // Automatic upgrade if database contains old global heritage sites
    if (list.some(site => ['taj-mahal', 'machu-picchu', 'colosseum', 'pyramids-giza'].includes(site.id))) {
      localStorage.setItem(LOCAL_STORAGE_SITES_KEY, JSON.stringify(DEFAULT_HERITAGE_SITES));
      return DEFAULT_HERITAGE_SITES;
    }
    return list;
  } catch {
    return DEFAULT_HERITAGE_SITES;
  }
};

const setLocalStorageSites = (sites: HeritageSite[]) => {
  localStorage.setItem(LOCAL_STORAGE_SITES_KEY, JSON.stringify(sites));
};

const getLocalStorageUser = (): UserState | null => {
  const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// MULTI-DRIVER BACKEND OPERATIONS DIRECTLY INTEGRATING FIRESTORE & LOCALFALLBACKS
export const backend = {
  // Load standard list of landmarks
  async getSites(onUpdate: (sites: HeritageSite[]) => void): Promise<() => void> {
    if (isFirebaseConfigured && db) {
      const sitesCollectionPath = 'heritage_sites';
      // Real-time synchronization
      const unsubscribe = onSnapshot(collection(db, sitesCollectionPath), (snapshot) => {
        const sites: HeritageSite[] = [];
        snapshot.forEach((doc) => {
          sites.push({ id: doc.id, ...doc.data() } as HeritageSite);
        });
        
        const hasOldSites = sites.some(site => ['taj-mahal', 'machu-picchu', 'colosseum', 'pyramids-giza'].includes(site.id));

        if (hasOldSites) {
          // Asynchronously purge and reseed to Yangon
          console.log("Migrating database from global landmarks to Yangon Heritage dataset...");
          sites.forEach(async (site) => {
            if (['taj-mahal', 'machu-picchu', 'colosseum', 'pyramids-giza', 'angkor-wat', 'chichen-itza', 'stonehenge', 'grand-canyon'].includes(site.id)) {
              try {
                await deleteDoc(doc(db, sitesCollectionPath, site.id));
              } catch (e) {
                console.warn("Failed to delete stale site doc:", e);
              }
            }
          });
          DEFAULT_HERITAGE_SITES.forEach(async (site) => {
            try {
              await setDoc(doc(db, sitesCollectionPath, site.id), site);
            } catch (err) {
              console.warn("Failed to write Yangon site during migration seeding:", err);
            }
          });
          return;
        }

        // If query returns empty on a newly provisioned db, seed it
        if (sites.length === 0) {
          // Trigger asynchronous batch seeding of default sites
          DEFAULT_HERITAGE_SITES.forEach(async (site) => {
            try {
              await setDoc(doc(db, sitesCollectionPath, site.id), site);
            } catch (err) {
              console.warn("Seeding failed: public users can list but standard writes may be blocked by rules.");
            }
          });
          onUpdate(DEFAULT_HERITAGE_SITES);
        } else {
          // Sort newly updated sites
          onUpdate(sites.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, sitesCollectionPath);
      });
      return unsubscribe;
    } else {
      // Offline fallback listing
      const sites = getLocalStorageSites();
      onUpdate(sites);
      const interval = setInterval(() => {
        onUpdate(getLocalStorageSites());
      }, 2000);
      return () => clearInterval(interval);
    }
  },

  // Insert a new site
  async addSite(site: HeritageSite, authorId?: string): Promise<void> {
    const siteData = { ...site, authorId: authorId || 'anonymous' };
    if (isFirebaseConfigured && db) {
      const pathForWrite = `heritage_sites/${site.id}`;
      try {
        await setDoc(doc(db, 'heritage_sites', site.id), siteData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, pathForWrite);
      }
    } else {
      const list = getLocalStorageSites();
      // Avoid duplicate
      const filtered = list.filter(item => item.id !== site.id);
      filtered.unshift(siteData);
      setLocalStorageSites(filtered);
    }
  },

  // Edit/Update site values
  async updateSite(site: HeritageSite, authorId?: string): Promise<void> {
    const updatedData = { ...site, authorId: authorId || 'anonymous' };
    if (isFirebaseConfigured && db) {
      const pathForWrite = `heritage_sites/${site.id}`;
      try {
        await setDoc(doc(db, 'heritage_sites', site.id), updatedData);
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, pathForWrite);
      }
    } else {
      const list = getLocalStorageSites();
      const updated = list.map(item => item.id === site.id ? updatedData : item);
      setLocalStorageSites(updated);
    }
  },

  // Delete site values
  async deleteSite(siteId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      const pathForDelete = `heritage_sites/${siteId}`;
      try {
        await deleteDoc(doc(db, 'heritage_sites', siteId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, pathForDelete);
      }
    } else {
      const list = getLocalStorageSites();
      const filtered = list.filter(item => item.id !== siteId);
      setLocalStorageSites(filtered);
    }
  },

  // Simple Auth System
  onAuth(onUserUpdate: (user: UserState | null) => void): () => void {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          onUserUpdate({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Curator',
            isAdmin: true // All authenticated users are allowed curation access in this mobile sandbox setup
          });
        } else {
          onUserUpdate(null);
        }
      });
      return unsubscribe;
    } else {
      // Local Auth mapping
      onUserUpdate(getLocalStorageUser());
      const interval = setInterval(() => {
        onUserUpdate(getLocalStorageUser());
      }, 1000);
      return () => clearInterval(interval);
    }
  },

  async login(emailOrName: string): Promise<void> {
    if (isFirebaseConfigured && auth) {
      // Rely on popup for easier sandbox compatibility
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (err) {
        console.warn("Popup blocked or declined. Attempting anonymous signIn for test curation.");
        await signInAnonymously(auth);
      }
    } else {
      // Mock log in
      const mockUser: UserState = {
        uid: 'local-curation-uid',
        email: emailOrName.includes('@') ? emailOrName : `${emailOrName}@heritage.org`,
        displayName: emailOrName.split('@')[0],
        isAdmin: true
      };
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    }
  },

  async logout(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }
};

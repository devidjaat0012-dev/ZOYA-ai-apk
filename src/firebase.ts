import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  initializeFirestore,
  setLogLevel,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";
import { MemoryItem, PersonaMode } from "./types";

// Silence verbose internal Firestore network warnings in preview/iframe environment
setLogLevel("silent");

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  // Graceful silent fallback so offline state does not trigger app errors
  if (process.env.NODE_ENV === "development") {
    // Only log if not unavailable/offline
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("unavailable") && !msg.includes("offline")) {
      console.debug("Firestore debug notice:", operationType, path, msg);
    }
  }
}

function sanitizeValidId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

export async function signInWithGooglePopup(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged };
export type { User };

let activeProfileSyncPromise: Promise<void> | null = null;

export async function syncUserProfileToFirestore(
  user: User,
  personaVibe: PersonaMode
): Promise<void> {
  if (!user.emailVerified || !user.uid) return;
  if (activeProfileSyncPromise) {
    return activeProfileSyncPromise;
  }

  activeProfileSyncPromise = (async () => {
    const uid = sanitizeValidId(user.uid);
    const path = `users/${uid}`;
    const userRef = doc(db, "users", uid);

    const safeDisplayName =
      (user.displayName || "Devid").trim().slice(0, 100) || "Devid";
    const safeEmail = (user.email || "user@example.com").trim().slice(0, 254);
    const safePhoto = (user.photoURL || "").trim().slice(0, 1024);
    const allowedPersonas: PersonaMode[] = [
      "girlfriend",
      "normal",
      "serious",
      "super_loyal",
    ];
    const safePersona: PersonaMode = allowedPersonas.includes(personaVibe)
      ? personaVibe
      : "girlfriend";

    try {
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          uid,
          displayName: safeDisplayName,
          email: safeEmail,
          photoURL: safePhoto,
          personaVibe: safePersona,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userRef, {
          displayName: safeDisplayName,
          photoURL: safePhoto,
          personaVibe: safePersona,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      activeProfileSyncPromise = null;
    }
  })();

  return activeProfileSyncPromise;
}

export async function syncMemoryItemToFirestore(
  user: User,
  item: MemoryItem
): Promise<void> {
  if (!user.emailVerified || !user.uid) return;
  const uid = sanitizeValidId(user.uid);
  const memId = sanitizeValidId(item.id);
  const path = `users/${uid}/memories/${memId}`;
  const memRef = doc(db, "users", uid, "memories", memId);

  const safeFact = item.fact.trim().slice(0, 500);
  if (!safeFact) return;

  try {
    await setDoc(memRef, {
      uid,
      fact: safeFact,
      category: item.category || "personal",
      source: item.source || "chat",
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMemoryItemFromFirestore(
  user: User,
  memoryId: string
): Promise<void> {
  if (!user.emailVerified || !user.uid) return;
  const uid = sanitizeValidId(user.uid);
  const memId = sanitizeValidId(memoryId);
  const path = `users/${uid}/memories/${memId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "memories", memId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchCloudMemoriesForUser(
  user: User
): Promise<MemoryItem[]> {
  if (!user.emailVerified || !user.uid) return [];
  const uid = sanitizeValidId(user.uid);
  const path = `users/${uid}/memories`;
  try {
    const q = query(
      collection(db, "users", uid, "memories"),
      where("uid", "==", uid)
    );
    const snap = await getDocs(q);
    const list: MemoryItem[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.fact === "string") {
        list.push({
          id: docSnap.id,
          fact: data.fact,
          category: data.category || "personal",
          source: data.source || "chat",
          createdAt:
            data.createdAt?.toMillis?.() || Date.now(),
        });
      }
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

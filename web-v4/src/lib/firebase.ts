import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

if (window.location.hostname === "127.0.0.1") {
  const localhostUrl = new URL(window.location.href);
  localhostUrl.hostname = "localhost";
  window.location.replace(localhostUrl.toString());
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const firestore = getFirestore(app);
const rtdb = getDatabase(app);

function safeConnect(connectFn: () => void) {
  try {
    connectFn();
  } catch (error) {
    const message = String((error as { message?: string })?.message || "");
    if (!message.toLowerCase().includes("already")) {
      console.warn("Firebase emulator connection warning", error);
    }
  }
}

if (window.location.hostname === "localhost") {
  safeConnect(() => connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true }));
  safeConnect(() => connectFirestoreEmulator(firestore, "127.0.0.1", 8080));
  safeConnect(() => connectDatabaseEmulator(rtdb, "127.0.0.1", 9000));
}

export { app, auth, provider, firestore, rtdb };

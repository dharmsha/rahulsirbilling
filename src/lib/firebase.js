// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC0jrx53KtvNtMP3qOJlYJUJaKuyQwJmS0",
  authDomain: "mggm-ee3c2.firebaseapp.com",
  projectId: "mggm-ee3c2",
  storageBucket: "mggm-ee3c2.firebasestorage.app",
  messagingSenderId: "652869026760",
  appId: "1:652869026760:web:3d0f91468c264a74f176fd",
  measurementId: "G-2MES2KVD47"
};

// Singleton — baar baar initialize na ho
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
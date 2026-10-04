// lib/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOij9d-7JZxPLQDWI3erCzQzlaq_WpAV0",
  authDomain: "sabjiwala-a99ae.firebaseapp.com",
  projectId: "sabjiwala-a99ae",
  storageBucket: "sabjiwala-a99ae.firebasestorage.app",
  messagingSenderId: "30458467335",
  appId: "1:30458467335:web:6fcf2b6ffecc167b8dc6a2",
  measurementId: "G-6YHJYGVJQK"
};

// Singleton — baar baar initialize na ho
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
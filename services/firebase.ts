
// @ts-ignore
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// الوصول الآمن لمتغيرات البيئة (يعمل مع Vite و Cloudflare)
const env = (import.meta as any).env || {};

// الإعدادات مع قيم احتياطية (Fallback) لضمان العمل
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyAi260IF9t6R-HDgGBXZiyydoNPP2pN5Xg",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "myfinance-78adf.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "myfinance-78adf",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "myfinance-78adf.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "993981009402",
  appId: env.VITE_FIREBASE_APP_ID || "1:993981009402:web:943ac00da6e003cf7e6843"
};

// تهيئة Firebase (نمط Singleton لمنع التهيئة المتكررة)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

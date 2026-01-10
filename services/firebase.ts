import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🛑🛑 STOP HERE 🛑🛑
// YOU MUST REPLACE THE VALUES BELOW WITH YOUR OWN FIREBASE PROJECT CONFIG
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project (or use existing)
// 3. Go to Project Settings -> General -> "Your apps" section
// 4. Select Web (</>) icon to create a web app
// 5. Copy the 'firebaseConfig' object and paste the values below

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAi260IF9t6R-HDgGBXZiyydoNPP2pN5Xg",
  authDomain: "myfinance-78adf.firebaseapp.com",
  projectId: "myfinance-78adf",
  storageBucket: "myfinance-78adf.firebasestorage.app",
  messagingSenderId: "993981009402",
  appId: "1:993981009402:web:943ac00da6e003cf7e6843"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
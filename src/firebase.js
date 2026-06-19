import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  
  apiKey: "AIzaSyCQVDGFFeJe0p9aD1s9zWvZ6mkiYaen_W9g",
  authDomain: "chatsphere-pro.firebaseapp.com",
  projectId: "chatsphere-pro",
  storageBucket: "chatsphere-pro.firebasestorage.app",
  messagingSenderId: "60414751667",
  appId: "1:60414751667:web:c16c35ed5efd5fe26fd1c6",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
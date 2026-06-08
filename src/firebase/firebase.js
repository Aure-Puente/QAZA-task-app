//Firebase:
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVlHCTOA-jWItOUmx_Njsoy96H1Lqfcck",
  authDomain: "qaza-app-118be.firebaseapp.com",
  projectId: "qaza-app-118be",
  storageBucket: "qaza-app-118be.firebasestorage.app",
  messagingSenderId: "604129437977",
  appId: "1:604129437977:web:4e0dddd60d40aa4a497d88"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
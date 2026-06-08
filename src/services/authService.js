//Importaciones:
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";

//JS:
    export async function registerUser({ name, email, password }) {
    const response = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = response.user;

    await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: firebaseUser.uid,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        createdAt: serverTimestamp(),
    });

    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    return userDoc.data();
    }

    export async function loginUser({ email, password }) {
    const response = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = response.user;

    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    return userDoc.data();
    }

    export async function logoutUser() {
    await signOut(auth);
}
//Importaciones:
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

//JS:
export async function createNote({
    title,
    categoryKey,
    text,
    createdBy,
    createdByName,
    }) {
    const docRef = await addDoc(collection(db, "notes"), {
        title: title.trim(),
        categoryKey,
        text: text.trim(),
        createdBy,
        createdByName,
        updatedBy: createdBy,
        updatedByName: createdByName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
    }

    export async function getAllNotes() {
    const snapshot = await getDocs(collection(db, "notes"));

    const notes = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
    }));

    return notes.sort((a, b) => {
        const aTime = a?.updatedAt?.seconds || a?.createdAt?.seconds || 0;
        const bTime = b?.updatedAt?.seconds || b?.createdAt?.seconds || 0;

        return bTime - aTime;
    });
    }

    export async function updateNote(noteId, updates) {
    await updateDoc(doc(db, "notes", noteId), {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteNote(noteId) {
    await deleteDoc(doc(db, "notes", noteId));
}
//Importaciones:
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

//JS:
export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));
}
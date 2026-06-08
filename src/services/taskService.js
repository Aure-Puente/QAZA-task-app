//Importaciones:
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

//JS:
export async function createTask({
  title,
  description,
  categoryKey,
  categoryLabel = "",
  createdBy,
  createdByName,
  assignedTo,
  assignedToName,
  assignedUsers = [],
  dueDate = null,
  dueDateTimestamp = null,
  hasDueDate = false,
  order = 0,
}) {
  const existingTasks = await getDocs(collection(db, "tasks"));
  const nextOrder = existingTasks.size;

  const safeAssignedUsers = Array.isArray(assignedUsers)
    ? assignedUsers
        .map((item) => ({
          uid: String(item?.uid || item?.id || ""),
          name: item?.name || item?.nombre || item?.email || "Usuario",
          email: item?.email || "",
        }))
        .filter((item) => item.uid)
    : [];

  const fallbackAssignedUser =
    safeAssignedUsers.length > 0
      ? safeAssignedUsers[0]
      : {
          uid: String(assignedTo || ""),
          name: assignedToName || "Usuario",
          email: "",
        };

  const docRef = await addDoc(collection(db, "tasks"), {
    title: title.trim(),
    description: description.trim(),

    categoryKey,
    categoryLabel,

    completed: false,

    createdBy,
    createdByName,

    // Campos viejos para compatibilidad:
    assignedTo: String(fallbackAssignedUser.uid || ""),
    assignedToName: fallbackAssignedUser.name || "Usuario",

    // Campo nuevo para múltiples responsables:
    assignedUsers: safeAssignedUsers.length > 0 ? safeAssignedUsers : [fallbackAssignedUser],

    dueDate,
    dueDateTimestamp,
    hasDueDate,

    order: typeof order === "number" ? order : nextOrder,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getAllTasks() {
  const snapshot = await getDocs(collection(db, "tasks"));

  const tasks = snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  }));

  return tasks.sort((a, b) => {
    const orderA = typeof a?.order === "number" ? a.order : 999999;
    const orderB = typeof b?.order === "number" ? b.order : 999999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const aTime = a?.createdAt?.seconds || 0;
    const bTime = b?.createdAt?.seconds || 0;
    return bTime - aTime;
  });
}

export async function updateTask(taskId, updates) {
  await updateDoc(doc(db, "tasks", taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleTaskCompleted(taskId, completed) {
  await updateDoc(doc(db, "tasks", taskId), {
    completed,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(taskId) {
  await deleteDoc(doc(db, "tasks", taskId));
}

export async function updateTasksOrder(tasks) {
  const batch = writeBatch(db);

  tasks.forEach((task, index) => {
    if (!task?.id) return;

    const taskRef = doc(db, "tasks", task.id);

    batch.update(taskRef, {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
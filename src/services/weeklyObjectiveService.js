//Importaciones:
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

//JS:
const WEEKLY_OBJECTIVES_COLLECTION = "weeklyObjectives";

export async function createWeeklyObjective({
    title,
    categoryKey,
    categoryLabel,
    startDate,
    endDate,
    startDateTimestamp,
    endDateTimestamp,
    createdBy,
    createdByName,
    assignedTo,
    assignedToName,
    assignedUsers = [],
}) {
    const docRef = await addDoc(collection(db, WEEKLY_OBJECTIVES_COLLECTION), {
        title: title.trim(),
        categoryKey,
        categoryLabel,

        startDate,
        endDate,
        startDateTimestamp,
        endDateTimestamp,

        createdBy,
        createdByName,

        assignedTo,
        assignedToName,
        assignedUsers,

        completed: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return docRef.id;
}

export async function getAllWeeklyObjectives() {
    const q = query(
        collection(db, WEEKLY_OBJECTIVES_COLLECTION),
        orderBy("startDateTimestamp", "asc")
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
    }));
}

export async function updateWeeklyObjective(objectiveId, data) {
    if (!objectiveId) return;

    const objectiveRef = doc(db, WEEKLY_OBJECTIVES_COLLECTION, objectiveId);

    await updateDoc(objectiveRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function toggleWeeklyObjectiveCompleted(objectiveId, completed) {
    if (!objectiveId) return;

    const objectiveRef = doc(db, WEEKLY_OBJECTIVES_COLLECTION, objectiveId);

    await updateDoc(objectiveRef, {
        completed: !!completed,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteWeeklyObjective(objectiveId) {
    if (!objectiveId) return;

    const objectiveRef = doc(db, WEEKLY_OBJECTIVES_COLLECTION, objectiveId);

    await deleteDoc(objectiveRef);
}
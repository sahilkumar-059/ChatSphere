import { db } from "../firebase";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Create a call history record when a call is initiated.
 * @param {Object} params
 * @param {string} params.callerId
 * @param {string} params.receiverId
 * @param {string} params.callerName
 * @param {string} params.receiverName
 * @param {string} params.callerPhoto
 * @param {string} params.receiverPhoto
 * @param {"voice"|"video"} params.callType
 * @param {"incoming"|"outgoing"} params.direction
 * @returns {Promise<string>} The document ID of the created record
 */
export async function createCallRecord({
  callerId,
  receiverId,
  callerName,
  receiverName,
  callerPhoto = "",
  receiverPhoto = "",
  callType,
  direction,
}) {
  try {
    const callHistoryCollection = collection(db, "callHistory");
    const docRef = await addDoc(callHistoryCollection, {
      callerId,
      receiverId,
      callerName,
      receiverName,
      callerPhoto,
      receiverPhoto,
      callType,
      direction,
      status: "ringing",
      startedAt: serverTimestamp(),
      answeredAt: null,
      endedAt: null,
      duration: null,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating call record:", error);
    return null;
  }
}

/**
 * Update a call history record when the call is answered.
 * @param {string} recordId - The document ID of the call record
 */
export async function markCallAnswered(recordId) {
  if (!recordId) return;
  try {
    const callRef = doc(db, "callHistory", recordId);
    await updateDoc(callRef, {
      status: "answered",
      answeredAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking call answered:", error);
  }
}

/**
 * Update a call history record when the call is rejected.
 * @param {string} recordId - The document ID of the call record
 */
export async function markCallRejected(recordId) {
  if (!recordId) return;
  try {
    const callRef = doc(db, "callHistory", recordId);
    await updateDoc(callRef, {
      status: "rejected",
      endedAt: serverTimestamp(),
      duration: 0,
    });
  } catch (error) {
    console.error("Error marking call rejected:", error);
  }
}

/**
 * Update a call history record when the call is cancelled by the caller.
 * @param {string} recordId - The document ID of the call record
 */
export async function markCallCancelled(recordId) {
  if (!recordId) return;
  try {
    const callRef = doc(db, "callHistory", recordId);
    await updateDoc(callRef, {
      status: "cancelled",
      endedAt: serverTimestamp(),
      duration: 0,
    });
  } catch (error) {
    console.error("Error marking call cancelled:", error);
  }
}

/**
 * Update a call history record when the call ends.
 * Calculates duration from answeredAt to now.
 * @param {string} recordId - The document ID of the call record
 */
export async function markCallEnded(recordId) {
  if (!recordId) return;
  try {
    const callRef = doc(db, "callHistory", recordId);
    await updateDoc(callRef, {
      status: "ended",
      endedAt: serverTimestamp(),
      // duration will be calculated client-side from answeredAt - will update after fetching
    });
  } catch (error) {
    console.error("Error marking call ended:", error);
  }
}

/**
 * Mark a ringing call as missed (when caller hung up without answer).
 * @param {string} recordId - The document ID of the call record
 */
export async function markCallMissed(recordId) {
  if (!recordId) return;
  try {
    const callRef = doc(db, "callHistory", recordId);
    await updateDoc(callRef, {
      status: "missed",
      endedAt: serverTimestamp(),
      duration: 0,
    });
  } catch (error) {
    console.error("Error marking call missed:", error);
  }
}

/**
 * Subscribe to all call history records where the user is either the caller or receiver.
 * Returns an unsubscribe function.
 * @param {string} userId
 * @param {function} callback - Receives array of call documents
 */
export function subscribeToCallHistory(userId, callback) {
  if (!userId) return () => {};

  const callHistoryCollection = collection(db, "callHistory");

  const qCaller = query(
    callHistoryCollection,
    where("callerId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const qReceiver = query(
    callHistoryCollection,
    where("receiverId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const allCalls = new Map();

  const handleSnapshot = (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const callDoc = {
        id: change.doc.id,
        ...change.doc.data(),
      };

      if (change.type === "removed") {
        allCalls.delete(callDoc.id);
      } else {
        allCalls.set(callDoc.id, callDoc);
      }
    });

    // Sort by createdAt descending
    const sorted = Array.from(allCalls.values()).sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt || 0;
      const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt || 0;
      return bTime - aTime;
    });

    callback(sorted);
  };

  const unsubscribeCaller = onSnapshot(qCaller, handleSnapshot);
  const unsubscribeReceiver = onSnapshot(qReceiver, handleSnapshot);

  return () => {
    unsubscribeCaller();
    unsubscribeReceiver();
  };
}

/**
 * Format call duration from seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "";
  if (seconds === 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}
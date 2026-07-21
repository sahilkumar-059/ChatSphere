import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Create a new notification document in Firestore.
 */
export async function createNotification({
  receiverId,
  type,
  title,
  message = "",
  senderId = "",
  senderName = "",
  senderPhoto = "",
  referenceId = "",
}) {
  if (!receiverId || !type || !title) {
    console.error("notificationService: Missing required fields", { receiverId, type, title });
    return null;
  }

  try {
    const notifRef = collection(db, "notifications");
    const docRef = await addDoc(notifRef, {
      receiverId,
      type,
      title,
      message,
      senderId,
      senderName,
      senderPhoto,
      referenceId,
      isRead: false,
      createdAt: serverTimestamp(),
    });
    console.log(`notificationService: Created ${type} notification for ${receiverId}: ${title}`);
    return docRef.id;
  } catch (error) {
    console.error("notificationService: Error creating notification:", error);
    return null;
  }
}

/**
 * Subscribe to real-time notifications for a user.
 * Sorted client-side to avoid needing a composite Firestore index.
 */
export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};

  const notifQuery = query(
    collection(db, "notifications"),
    where("receiverId", "==", userId)
  );

  return onSnapshot(
    notifQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });
      // Sort client-side by createdAt descending (newest first)
      notifications.sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });
      callback(notifications);
    },
    (error) => {
      console.error("notificationService: Subscription error:", error);
      callback([]);
    }
  );
}

/**
 * Subscribe ONLY to unread count for badge updates.
 * Lightweight - doesn't fetch full documents.
 */
export function subscribeToUnreadCount(userId, callback) {
  if (!userId) return () => {};

  const unreadQuery = query(
    collection(db, "notifications"),
    where("receiverId", "==", userId),
    where("isRead", "==", false)
  );

  return onSnapshot(
    unreadQuery,
    (snapshot) => {
      callback(snapshot.docs.length);
    },
    (error) => {
      console.error("notificationService: Unread count error:", error);
    }
  );
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId) {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
  } catch (error) {
    console.error("notificationService: Error marking as read:", error);
  }
}

/**
 * Mark all unread notifications for a user as read.
 */
export async function markAllAsRead(userId) {
  if (!userId) return;
  try {
    const notifQuery = query(
      collection(db, "notifications"),
      where("receiverId", "==", userId),
      where("isRead", "==", false)
    );
    const snapshot = await getDocs(notifQuery);
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { isRead: true });
    });
    await batch.commit();
    console.log(`notificationService: Marked ${snapshot.docs.length} notifications as read`);
  } catch (error) {
    console.error("notificationService: Error marking all as read:", error);
  }
}

/**
 * Clear (delete) all notifications for a user.
 */
export async function clearAllNotifications(userId) {
  if (!userId) return;
  try {
    const notifQuery = query(
      collection(db, "notifications"),
      where("receiverId", "==", userId)
    );
    const snapshot = await getDocs(notifQuery);
    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
    console.log(`notificationService: Cleared ${snapshot.docs.length} notifications`);
  } catch (error) {
    console.error("notificationService: Error clearing notifications:", error);
  }
}

/**
 * Delete a single notification by ID.
 */
export async function deleteSingleNotification(notificationId) {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
  } catch (error) {
    console.error("notificationService: Error deleting notification:", error);
  }
}

/**
 * Get the unread notification count for a user (one-time fetch).
 */
export async function getUnreadNotificationCount(userId) {
  if (!userId) return 0;
  try {
    const notifQuery = query(
      collection(db, "notifications"),
      where("receiverId", "==", userId),
      where("isRead", "==", false)
    );
    const snapshot = await getDocs(notifQuery);
    return snapshot.docs.length;
  } catch {
    return 0;
  }
}

/**
 * Format a relative time string.
 */
export function formatRelativeTime(date) {
  if (!date) return "";
  const now = new Date();
  const d = date instanceof Date ? date : date.toDate?.() || new Date(date);
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 2) return "1m ago";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 2) return "1h ago";
  if (diffHr < 24) return `${diffHr}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  if (diffDays < 7) return `${diffDays}d ago`;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (diffDays < 14) return `Last ${dayNames[d.getDay()]}`;

  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
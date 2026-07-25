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
  getDoc,
  setDoc,
  increment,
} from "firebase/firestore";
import { db } from "../firebase";

// ============================================================
// FIRESTORE STRUCTURE
// ============================================================
// notifications/{notificationId} - One per notification
//   receiverId, senderId, senderName, senderPhoto, chatId, type, message, isRead, createdAt
//
// unreadCounts/{userId} - Single doc per user
//   total: number (global unread count for sidebar green dot)
//   chats: { [chatId]: number } (per-chat unread for green badges)
//   updatedAt: timestamp

// ============================================================
// 1. CREATE NOTIFICATION
// ============================================================
export async function createNotification({
  receiverId,
  type,
  title = "",
  message = "",
  senderId = "",
  senderName = "",
  senderPhoto = "",
  chatId = "",
  isRead = false,
}) {
  if (!receiverId || !type) return null;
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
      chatId,
      isRead: isRead ? true : false,
      createdAt: serverTimestamp(),
    });

    // If NOT already read (receiver is not viewing), increment counts
    if (!isRead) {
      await incrementChatUnread(receiverId, chatId || type);
    }

    return docRef.id;
  } catch (error) {
    console.error("notificationService: Error creating notification:", error);
    return null;
  }
}

// ============================================================
// 2. UNREAD COUNTS (stored in unreadCounts/{userId})
// ============================================================

// Increment both total and per-chat count
export async function incrementChatUnread(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    const ref = doc(db, "unreadCounts", userId);
    // Use dot notation to increment nested map field + total
    const updates = {
      total: increment(1),
      [`chats.${chatId}`]: increment(1),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, updates, { merge: true });
  } catch (error) {
    console.error("notificationService: Error incrementing unread:", error);
  }
}

// Reset a specific chat's unread to 0, and decrement total
export async function resetChatUnread(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    const ref = doc(db, "unreadCounts", userId);
    const snap = await getDoc(ref);
    let current = 0;
    if (snap.exists()) {
      current = snap.data()?.chats?.[chatId] || 0;
    }
    if (current <= 0) return; // nothing to reset
    await setDoc(ref, {
      total: increment(-current),
      [`chats.${chatId}`]: 0,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error resetting chat unread:", error);
  }
}

// Mark all unread notifications as read + reset counts
// Mark all unread notification docs as read + reset counts
export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  try {
    // 1. Mark all unread notification docs
    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", userId),
      where("isRead", "==", false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.update(d.ref, { isRead: true }));
    await batch.commit();

    // 2. Reset unread counts
    const ref = doc(db, "unreadCounts", userId);
    await setDoc(ref, {
      total: 0,
      chats: {},
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error marking all read:", error);
  }
}

// Subscribe to unread counts (total + per-chat map)
export function subscribeToUnreadCounts(userId, callback) {
  if (!userId) return () => {};
  const ref = doc(db, "unreadCounts", userId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback({
        total: data.total || 0,
        chats: data.chats || {},
      });
    } else {
      callback({ total: 0, chats: {} });
    }
  }, () => callback({ total: 0, chats: {} }));
}

// ============================================================
// 3. SUBSCRIBE TO NOTIFICATIONS (for notification page)
// ============================================================
export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};
  const q = query(
    collection(db, "notifications"),
    where("receiverId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      };
    });
    // Sort newest first
    list.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
    callback(list);
  }, () => callback([]));
}

// ============================================================
// 4. MARK NOTIFICATION AS READ (single)
// ============================================================
// Mark a single notification as read
export async function markAsRead(notificationId) {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
  } catch (error) {
    console.error("notificationService: Error marking as read:", error);
  }
}

// ============================================================
// 5. DELETE NOTIFICATION
// ============================================================
// Delete a single notification
export async function deleteNotification(notificationId) {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
  } catch (error) {
    console.error("notificationService: Error deleting notification:", error);
  }
}

export async function clearAllNotifications(userId) {
  if (!userId) return;
  try {
    const q = query(collection(db, "notifications"), where("receiverId", "==", userId));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    const ref = doc(db, "unreadCounts", userId);
    await setDoc(ref, { total: 0, chats: {}, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error clearing notifications:", error);
  }
}

// ============================================================
// 6. FORMAT RELATIVE TIME
// ============================================================
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

// ============================================================
// 7. NOTIFICATION SETTINGS (simplified)
// ============================================================
const DEFAULT_SETTINGS = {
  messages: true,
  calls: true,
  friends: true,
  messageSound: true,
  messageVibration: true,
  muteAll: false,
};

export async function getNotificationSettings(userId) {
  if (!userId) return { ...DEFAULT_SETTINGS };
  try {
    const snap = await getDoc(doc(db, "notificationSettings", userId));
    return snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateNotificationSetting(userId, key, value) {
  if (!userId) return;
  try {
    await setDoc(doc(db, "notificationSettings", userId), { [key]: value, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error updating setting:", error);
  }
}

export function subscribeToNotificationSettings(userId, callback) {
  if (!userId) return () => {};
  return onSnapshot(doc(db, "notificationSettings", userId), (snap) => {
    callback(snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS });
  }, () => callback({ ...DEFAULT_SETTINGS }));
}

// ============================================================
// 8. CHAT MUTE FUNCTIONALITY
// ============================================================

export const MUTE_DURATION_OPTIONS = [
  { id: "8h", label: "8 hours", icon: "🕐" },
  { id: "1d", label: "1 day", icon: "📅" },
  { id: "1w", label: "1 week", icon: "📆" },
  { id: "forever", label: "Forever", icon: "∞" },
];

export async function muteChat(userId, chatId, duration) {
  if (!userId || !chatId || !duration) return;
  try {
    let mutedUntil = null;
    if (duration !== "forever") {
      const now = new Date();
      const durations = {
        "8h": 8 * 60 * 60 * 1000,
        "1d": 24 * 60 * 60 * 1000,
        "1w": 7 * 24 * 60 * 60 * 1000,
      };
      mutedUntil = new Date(now.getTime() + durations[duration]);
    }
    await setDoc(doc(db, "chatMutes", `${userId}_${chatId}`), {
      userId,
      chatId,
      mutedDuration: duration,
      mutedUntil: mutedUntil ? serverTimestamp() : null,
      isMuted: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error muting chat:", error);
  }
}

export async function unmuteChat(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    await deleteDoc(doc(db, "chatMutes", `${userId}_${chatId}`));
  } catch (error) {
    console.error("notificationService: Error unmuting chat:", error);
  }
}

export async function getChatMuteStatus(userId, chatId) {
  if (!userId || !chatId) return { isMuted: false };
  try {
    const snap = await getDoc(doc(db, "chatMutes", `${userId}_${chatId}`));
    if (!snap.exists()) return { isMuted: false };
    const data = snap.data();
    if (data.mutedDuration === "forever") {
      return { isMuted: true, mutedDuration: "forever", mutedUntil: null };
    }
    if (data.mutedUntil) {
      const mutedUntil = data.mutedUntil.toDate();
      const now = new Date();
      if (mutedUntil > now) {
        return { isMuted: true, mutedDuration: data.mutedDuration, mutedUntil };
      }
      // Mute expired, delete it
      await deleteDoc(doc(db, "chatMutes", `${userId}_${chatId}`));
    }
    return { isMuted: false };
  } catch (error) {
    console.error("notificationService: Error getting mute status:", error);
    return { isMuted: false };
  }
}

export function formatMuteExpiry(mutedUntil) {
  if (!mutedUntil) return "Forever";
  const now = new Date();
  const d = mutedUntil instanceof Date ? mutedUntil : mutedUntil.toDate?.() || new Date(mutedUntil);
  const diffMs = d - now;
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 60) return `${diffMin} minutes`;
  if (diffHr < 24) return `${diffHr} hours`;
  return `${diffDays} days`;
}

// ============================================================
// 9. UNREAD COUNT SUMMARY (for App.jsx)
// ============================================================

export function subscribeToUnreadCountSummary(userId, callback) {
  return subscribeToUnreadCounts(userId, callback);
}

export function resetChatUnreadCount(userId, chatId) {
  return resetChatUnread(userId, chatId);
}

export function subscribeToChatUnreadCounts(userId, callback) {
  return subscribeToUnreadCounts(userId, callback);
}

export function markAllAsRead(userId) {
  return markAllNotificationsRead(userId);
}
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
// 1. NOTIFICATION DOCUMENT CREATION
// ============================================================

/**
 * Create a new notification document in Firestore.
 * Respects notification settings and mute settings.
 * If the receiver is viewing the chat, does NOT create unread badge.
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
  isReceiverViewingChat = false,
}) {
  if (!receiverId || !type || !title) {
    console.error("notificationService: Missing required fields", { receiverId, type, title });
    return null;
  }

  try {
    // 1. Check if receiver has muted all notifications globally
    const notifSettings = await getNotificationSettings(receiverId);
    if (notifSettings.muteAll) {
      console.log("notificationService: User has globally muted all notifications");
      return null;
    }

    // 2. Check per-type settings
    const typeKey = getTypeKey(type);
    if (notifSettings[typeKey] === false) {
      console.log(`notificationService: ${type} notifications disabled for user`);
      return null;
    }

    // 3. Check per-chat mute settings for message types
    if (type === "message" && referenceId) {
      const chatMute = await getChatMuteStatus(receiverId, referenceId);
      if (chatMute.isMuted) {
        console.log(`notificationService: Chat ${referenceId} is muted until ${chatMute.mutedUntil}`);
        // Still create the notification but don't mark it as urgent
        // We'll still create it but skip sound/popup
      }
    }

    // 4. If receiver is viewing this chat, skip unread increment
    if (isReceiverViewingChat) {
      console.log("notificationService: Receiver is viewing chat, skipping unread increment");
      const notifRef = collection(db, "notifications");
      await addDoc(notifRef, {
        receiverId,
        type,
        title,
        message,
        senderId,
        senderName,
        senderPhoto,
        referenceId,
        isRead: true, // Mark as read since they're viewing
        createdAt: serverTimestamp(),
      });
      return null;
    }

    // 5. Create notification with isRead: false
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

    // 6. Increment unread count in user's notification summary
    await incrementUnreadCount(receiverId, 1);

    console.log(`notificationService: Created ${type} notification for ${receiverId}: ${title}`);
    return docRef.id;
  } catch (error) {
    console.error("notificationService: Error creating notification:", error);
    return null;
  }
}

function getTypeKey(type) {
  const map = {
    message: "messages",
    friend: "friends",
    call: "calls",
    system: "system",
    image: "messages",
    voice: "messages",
  };
  return map[type] || type;
}

// ============================================================
// 2. UNREAD COUNT MANAGEMENT
// ============================================================

// Increment or decrement the global unread count for a user
async function incrementUnreadCount(userId, amount) {
  try {
    const summaryRef = doc(db, "notificationSummary", userId);
    await setDoc(summaryRef, {
      unreadCount: increment(amount),
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error incrementing unread count:", error);
  }
}

// Reset unread count to 0
async function resetUnreadCount(userId) {
  try {
    const summaryRef = doc(db, "notificationSummary", userId);
    await setDoc(summaryRef, {
      unreadCount: 0,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error resetting unread count:", error);
  }
}

// Get unread count from summary (fast, no query)
export async function getUnreadCountFromSummary(userId) {
  if (!userId) return 0;
  try {
    const summaryRef = doc(db, "notificationSummary", userId);
    const snap = await getDoc(summaryRef);
    if (snap.exists()) {
      return snap.data().unreadCount || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

// Subscribe to unread count via summary document (realtime)
export function subscribeToUnreadCountSummary(userId, callback) {
  if (!userId) return () => {};

  const summaryRef = doc(db, "notificationSummary", userId);
  return onSnapshot(summaryRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data().unreadCount || 0);
    } else {
      callback(0);
    }
  }, (error) => {
    console.error("notificationService: Unread count summary error:", error);
    callback(0);
  });
}

// ============================================================
// 3. NOTIFICATION SETTINGS (per user)
// ============================================================

const DEFAULT_NOTIFICATION_SETTINGS = {
  // Messages
  messages: true,
  messageSound: true,
  messagePopup: true,
  messageVibration: true,
  messageBadge: true,
  // Calls
  calls: true,
  missedCallAlerts: true,
  // Friends
  friends: true,
  friendAccepted: true,
  // Global
  muteAll: false,
};

export async function getNotificationSettings(userId) {
  if (!userId) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  try {
    const settingsRef = doc(db, "notificationSettings", userId);
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...snap.data() };
    }
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export async function updateNotificationSetting(userId, key, value) {
  if (!userId) return;
  try {
    const settingsRef = doc(db, "notificationSettings", userId);
    await setDoc(settingsRef, {
      [key]: value,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error updating notification setting:", error);
  }
}

export async function updateNotificationSettings(userId, settings) {
  if (!userId) return;
  try {
    const settingsRef = doc(db, "notificationSettings", userId);
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error updating notification settings:", error);
  }
}

export function subscribeToNotificationSettings(userId, callback) {
  if (!userId) return () => {};
  const settingsRef = doc(db, "notificationSettings", userId);
  return onSnapshot(settingsRef, (snap) => {
    if (snap.exists()) {
      callback({ ...DEFAULT_NOTIFICATION_SETTINGS, ...snap.data() });
    } else {
      callback({ ...DEFAULT_NOTIFICATION_SETTINGS });
    }
  }, (error) => {
    console.error("notificationService: Settings subscription error:", error);
    callback({ ...DEFAULT_NOTIFICATION_SETTINGS });
  });
}

// ============================================================
// 4. PER-CHAT MUTE SETTINGS
// ============================================================

const MUTE_DURATIONS = {
  "1h": 1 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  always: Infinity,
};

export async function muteChat(userId, chatId, duration) {
  if (!userId || !chatId) return;
  try {
    const muteRef = doc(db, "chatMutes", `${userId}_${chatId}`);
    let mutedUntil = null;
    if (duration === "always") {
      mutedUntil = new Date(9999, 11, 31); // Far future
    } else {
      mutedUntil = new Date(Date.now() + (MUTE_DURATIONS[duration] || 0));
    }
    await setDoc(muteRef, {
      userId,
      chatId,
      mutedUntil,
      mutedDuration: duration,
      createdAt: serverTimestamp(),
    }, { merge: true });
    console.log(`notificationService: Muted chat ${chatId} for ${duration}`);
  } catch (error) {
    console.error("notificationService: Error muting chat:", error);
  }
}

export async function unmuteChat(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    const muteRef = doc(db, "chatMutes", `${userId}_${chatId}`);
    await deleteDoc(muteRef);
    console.log(`notificationService: Unmuted chat ${chatId}`);
  } catch (error) {
    console.error("notificationService: Error unmuting chat:", error);
  }
}

export async function getChatMuteStatus(userId, chatId) {
  if (!userId || !chatId) {
    return { isMuted: false, mutedUntil: null, mutedDuration: null };
  }
  try {
    const muteRef = doc(db, "chatMutes", `${userId}_${chatId}`);
    const snap = await getDoc(muteRef);
    if (snap.exists()) {
      const data = snap.data();
      const mutedUntil = data.mutedUntil?.toDate?.() || data.mutedUntil;
      // Check if mute has expired
      if (mutedUntil && new Date(mutedUntil) > new Date()) {
        return {
          isMuted: true,
          mutedUntil,
          mutedDuration: data.mutedDuration,
        };
      }
      // Mute expired, clean up
      if (mutedUntil && new Date(mutedUntil) <= new Date()) {
        await deleteDoc(muteRef).catch(() => {});
      }
    }
    return { isMuted: false, mutedUntil: null, mutedDuration: null };
  } catch {
    return { isMuted: false, mutedUntil: null, mutedDuration: null };
  }
}

export function subscribeToChatMuteStatus(userId, chatId, callback) {
  if (!userId || !chatId) return () => {};
  const muteRef = doc(db, "chatMutes", `${userId}_${chatId}`);
  return onSnapshot(muteRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const mutedUntil = data.mutedUntil?.toDate?.() || data.mutedUntil;
      if (mutedUntil && new Date(mutedUntil) > new Date()) {
        callback({ isMuted: true, mutedUntil, mutedDuration: data.mutedDuration });
        return;
      }
    }
    callback({ isMuted: false, mutedUntil: null, mutedDuration: null });
  }, () => {
    callback({ isMuted: false, mutedUntil: null, mutedDuration: null });
  });
}

// ============================================================
// 5. MESSAGE UNREAD COUNT PER CHAT
// ============================================================

/**
 * Track unread messages per chat using a subcollection or a map in the chat doc.
 * We'll store unreadCounts as a map in notificationSummary for each user:
 *   notificationSummary/{userId}/chatUnread/{chatId}: count
 *   OR simpler: store an object map on the notificationSummary doc
 */
export function subscribeToChatUnreadCounts(userId, callback) {
  if (!userId) return () => {};
  const summaryRef = doc(db, "notificationSummary", userId);
  return onSnapshot(summaryRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback(data.chatUnread || {});
    } else {
      callback({});
    }
  }, () => callback({}));
}

/**
 * Increment or set unread count for a specific chat.
 * Used by sendMessage to mark unread when receiver isn't viewing.
 */
export async function incrementChatUnreadCount(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    const summaryRef = doc(db, "notificationSummary", userId);
    await setDoc(summaryRef, {
      [`chatUnread.${chatId}`]: increment(1),
      unreadCount: increment(1),
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error incrementing chat unread:", error);
  }
}

/**
 * Reset unread count for a specific chat (when user opens the chat).
 */
export async function resetChatUnreadCount(userId, chatId) {
  if (!userId || !chatId) return;
  try {
    const summaryRef = doc(db, "notificationSummary", userId);
    // Get current unread for this chat to know how much to subtract from total
    const snap = await getDoc(summaryRef);
    let currentUnread = 0;
    if (snap.exists()) {
      const data = snap.data();
      currentUnread = data.chatUnread?.[chatId] || 0;
    }
    await setDoc(summaryRef, {
      [`chatUnread.${chatId}`]: 0,
      unreadCount: Math.max(0, increment(-currentUnread)),
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("notificationService: Error resetting chat unread:", error);
  }
}

// ============================================================
// 6. SUBSCRIPTIONS (existing enhanced)
// ============================================================

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

export async function markAsRead(notificationId) {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
  } catch (error) {
    console.error("notificationService: Error marking as read:", error);
  }
}

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
    // Reset unread count
    await resetUnreadCount(userId);
    console.log(`notificationService: Marked ${snapshot.docs.length} notifications as read`);
  } catch (error) {
    console.error("notificationService: Error marking all as read:", error);
  }
}

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
    await resetUnreadCount(userId);
    console.log(`notificationService: Cleared ${snapshot.docs.length} notifications`);
  } catch (error) {
    console.error("notificationService: Error clearing notifications:", error);
  }
}

export async function deleteSingleNotification(notificationId) {
  if (!notificationId) return;
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
  } catch (error) {
    console.error("notificationService: Error deleting notification:", error);
  }
}

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
// 7. MUTE DURATION HELPERS
// ============================================================

export const MUTE_DURATION_OPTIONS = [
  { id: "1h", label: "1 Hour", icon: "⏰" },
  { id: "8h", label: "8 Hours", icon: "🌙" },
  { id: "24h", label: "24 Hours", icon: "📅" },
  { id: "7d", label: "7 Days", icon: "📆" },
  { id: "always", label: "Always", icon: "🔇" },
];

export function getMuteDurationLabel(duration) {
  const option = MUTE_DURATION_OPTIONS.find(o => o.id === duration);
  return option?.label || duration;
}

export function formatMuteExpiry(mutedUntil) {
  if (!mutedUntil) return "";
  const date = mutedUntil instanceof Date ? mutedUntil : mutedUntil.toDate?.();
  if (!date) return "";
  if (date.getFullYear() >= 9999) return "Always";
  return `Until ${date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
}
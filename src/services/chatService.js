import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

// Generate a unique chat ID for two users (sorted to ensure consistency)
function getChatId(userId1, userId2) {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

// Create or get a chat room for two users
export async function getOrCreateChatRoom(userId1, userId2) {
  const chatId = getChatId(userId1, userId2);
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);

  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      id: chatId,
      participants: [userId1, userId2],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: null,
    });
  }

  return chatId;
}

// Send a message to a chat room
export async function sendMessage(chatId, messageData) {
  const messagesRef = collection(db, "messages");
  const messagePayload = {
    ...messageData,
    chatId,
    createdAt: serverTimestamp(),
    status: "sent",
  };

  const messageDoc = await addDoc(messagesRef, messagePayload);

  // Update chat room with last message info
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: messageData.text || (messageData.type === "image" ? "📷 Image" : "🎤 Voice"),
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Simulate delivery and read receipts
  setTimeout(() => {
    updateDoc(doc(db, "messages", messageDoc.id), { status: "delivered" }).catch(() => {});
  }, 800);

  setTimeout(() => {
    updateDoc(doc(db, "messages", messageDoc.id), { status: "seen", seenAt: serverTimestamp() }).catch(() => {});
  }, 1500);

  return messageDoc.id;
}

// Subscribe to messages for a specific chat
export function subscribeToMessages(chatId, onMessagesUpdate) {
  if (!chatId) return () => {};

  const messagesQuery = query(
    collection(db, "messages"),
    where("chatId", "==", chatId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timeLabel: formatTimeLabel(doc.data().createdAt),
    }));
    onMessagesUpdate(messages);
  });
}

// Subscribe to user's chats (chat rooms where user is a participant)
export function subscribeToUserChats(userId, onChatsUpdate) {
  if (!userId) return () => {};

  const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", userId));

  return onSnapshot(chatsQuery, (snapshot) => {
    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    onChatsUpdate(chats);
  });
}

// Get chat room data
export async function getChatRoom(chatId) {
  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  return chatSnap.exists() ? { id: chatSnap.id, ...chatSnap.data() } : null;
}

// Mark messages as seen
export async function markMessagesAsSeen(chatId, userId) {
  const messagesQuery = query(
    collection(db, "messages"),
    where("chatId", "==", chatId),
    where("senderId", "!=", userId),
    where("status", "!=", "seen")
  );

  const snapshot = await getDocs(messagesQuery);
  const updates = snapshot.docs.map((doc) =>
    updateDoc(doc.ref, { status: "seen", seenAt: serverTimestamp() })
  );

  await Promise.all(updates);
}

// Format timestamp to time label
function formatTimeLabel(timestamp) {
  if (!timestamp) return "";
  const date = timestamp?.toDate?.() || new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Get unread count for a chat
export async function getUnreadCount(chatId, userId) {
  const messagesQuery = query(
    collection(db, "messages"),
    where("chatId", "==", chatId),
    where("senderId", "!=", userId),
    where("status", "!=", "seen")
  );

  const snapshot = await getDocs(messagesQuery);
  return snapshot.docs.length;
}

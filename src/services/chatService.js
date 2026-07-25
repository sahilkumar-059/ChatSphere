import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { createNotification } from "./notificationService";

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
  console.log("chatService: Sending message to chatId:", chatId, "data:", messageData);
  
  const messagesRef = collection(db, "messages");
  const messagePayload = {
    ...messageData,
    chatId,
    createdAt: serverTimestamp(),
    status: "sent",
  };

  const messageDoc = await addDoc(messagesRef, messagePayload);
  console.log("chatService: Message sent with ID:", messageDoc.id);

  // Update chat room with last message info
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: messageData.text || (messageData.type === "image" ? "📷 Image" : "🎤 Voice"),
    lastMessageTime: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Create notification for the receiver
  if (messageData.receiverId && messageData.receiverId !== messageData.senderId) {
    await createNotification({
      receiverId: messageData.receiverId,
      type: "message",
      title: "New message",
      message: messageData.text || (messageData.type === "image" ? "📷 Image" : "🎤 Voice"),
      senderId: messageData.senderId,
      senderName: messageData.senderName || "Someone",
      senderPhoto: messageData.senderPhotoURL || "",
      chatId,
    }).catch((err) => console.error("Failed to create notification:", err));
  }

  // Simulate delivery and read receipts
  setTimeout(() => {
    updateDoc(doc(db, "messages", messageDoc.id), { status: "delivered" }).catch(() => {});
  }, 800);

  setTimeout(() => {
    updateDoc(doc(db, "messages", messageDoc.id), { status: "seen", seenAt: serverTimestamp() }).catch(() => {});
  }, 1500);

  return messageDoc.id;
}

// Load all messages for a chat room once
export async function loadMessages(chatId) {
  if (!chatId) return [];

  const messagesQuery = query(
    collection(db, "messages"),
    where("chatId", "==", chatId)
  );

  const snapshot = await getDocs(messagesQuery);
  const messages = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    timeLabel: formatTimeLabel(doc.data().createdAt),
  }));
  // Sort client-side to avoid needing a composite Firestore index
  messages.sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
    const bTime = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
    return aTime - bTime;
  });
  return messages;
}

// Subscribe to messages for a specific chat
export function subscribeToMessages(chatId, onMessagesUpdate) {
  if (!chatId) return () => {};

  console.log("chatService: Subscribing to messages for chatId:", chatId);

  // NOTE: No orderBy() here to avoid requiring a composite Firestore index.
  // Messages are sorted client-side in the snapshot callback.
  const messagesQuery = query(
    collection(db, "messages"),
    where("chatId", "==", chatId)
  );

  return onSnapshot(messagesQuery, (snapshot) => {
    console.log("chatService: Firestore snapshot received");
    console.log("chatService: Snapshot size:", snapshot.docs.length);
    console.log("chatService: Querying for chatId:", chatId);
    
    snapshot.docs.forEach((doc) => {
      console.log("chatService: Message doc:", doc.id, "data.chatId:", doc.data().chatId);
    });
    
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timeLabel: formatTimeLabel(doc.data().createdAt),
    }));
    // Sort client-side to avoid needing a composite Firestore index
    messages.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0;
      return aTime - bTime;
    });
    console.log("chatService: Processed messages:", messages);
    onMessagesUpdate(messages);
  }, (error) => {
    console.error("chatService: Subscription error:", error);
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

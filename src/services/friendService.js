import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

export const RELATIONSHIP = {
  NONE: "none",
  FRIENDS: "friends",
  PENDING_OUT: "pending_out",
  PENDING_IN: "pending_in",
};

function requestDocId(fromUserId, toUserId) {
  return `${fromUserId}_${toUserId}`;
}

function friendshipDocId(userId, friendId) {
  return `${userId}_${friendId}`;
}

function normalizeUser(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    uid: data.uid || docSnap.id,
    fullName: data.fullName || data.displayName || "ChatSphere User",
    username: data.username || "",
    email: data.email || "",
    photoURL: data.photoURL || "",
    isOnline: Boolean(data.isOnline),
    bio: data.bio || "",
  };
}

function matchesSearch(user, term) {
  // Search only by username (not email or full name)
  const username = (user.username || "").toLowerCase();
  return username.includes(term);
}

export async function searchUsers(searchTerm, currentUserId) {
  const term = searchTerm.trim().toLowerCase();
  if (!term || term.length < 2) return [];

  const snapshot = await getDocs(query(collection(db, "users"), limit(150)));
  return snapshot.docs
    .map(normalizeUser)
    .filter((user) => user.uid !== currentUserId)
    .filter((user) => matchesSearch(user, term))
    .slice(0, 24);
}

export function getRelationshipStatus(targetUserId, { friendIds, outgoingIds, incomingIds }) {
  if (friendIds.has(targetUserId)) return RELATIONSHIP.FRIENDS;
  if (outgoingIds.has(targetUserId)) return RELATIONSHIP.PENDING_OUT;
  if (incomingIds.has(targetUserId)) return RELATIONSHIP.PENDING_IN;
  return RELATIONSHIP.NONE;
}

export async function sendFriendRequest(currentUser, targetUser) {
  const fromUserId = currentUser.uid;
  const toUserId = targetUser.uid;

  if (fromUserId === toUserId) {
    throw new Error("You cannot send a friend request to yourself.");
  }

  const friendRef = doc(db, "friends", friendshipDocId(fromUserId, toUserId));
  const friendSnap = await getDoc(friendRef);
  if (friendSnap.exists()) {
    throw new Error("You are already friends with this user.");
  }

  const outgoingRef = doc(db, "friendRequests", requestDocId(fromUserId, toUserId));
  const outgoingSnap = await getDoc(outgoingRef);
  if (outgoingSnap.exists() && outgoingSnap.data().status === "pending") {
    throw new Error("Friend request already sent.");
  }

  const incomingRef = doc(db, "friendRequests", requestDocId(toUserId, fromUserId));
  const incomingSnap = await getDoc(incomingRef);
  if (incomingSnap.exists() && incomingSnap.data().status === "pending") {
    throw new Error("This user already sent you a request. Check Friend Requests.");
  }

  await setDoc(outgoingRef, {
    fromUserId,
    fromUserName: currentUser.displayName || currentUser.fullName || "ChatSphere User",
    fromUsername: currentUser.username || "",
    fromPhotoURL: currentUser.photoURL || "",
    toUserId,
    toUserName: targetUser.fullName || "ChatSphere User",
    toUsername: targetUser.username || "",
    toPhotoURL: targetUser.photoURL || "",
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(request) {
  const { id, fromUserId, toUserId, fromUserName, fromUsername, fromPhotoURL, toUserName, toUsername, toPhotoURL } =
    request;

  await updateDoc(doc(db, "friendRequests", id), {
    status: "accepted",
    updatedAt: serverTimestamp(),
  });

  const now = serverTimestamp();

  await setDoc(doc(db, "friends", friendshipDocId(toUserId, fromUserId)), {
    userId: toUserId,
    friendId: fromUserId,
    friendFullName: fromUserName,
    friendUsername: fromUsername,
    friendPhotoURL: fromPhotoURL,
    createdAt: now,
  });

  await setDoc(doc(db, "friends", friendshipDocId(fromUserId, toUserId)), {
    userId: fromUserId,
    friendId: toUserId,
    friendFullName: toUserName,
    friendUsername: toUsername,
    friendPhotoURL: toPhotoURL,
    createdAt: now,
  });
}

export async function rejectFriendRequest(requestId) {
  await updateDoc(doc(db, "friendRequests", requestId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
}

export function subscribeFriendData(userId, onData) {
  if (!userId) return () => {};

  const friendsQuery = query(collection(db, "friends"), where("userId", "==", userId));
  const incomingQuery = query(
    collection(db, "friendRequests"),
    where("toUserId", "==", userId),
    where("status", "==", "pending")
  );
  const outgoingQuery = query(
    collection(db, "friendRequests"),
    where("fromUserId", "==", userId),
    where("status", "==", "pending")
  );

  let friends = [];
  let incoming = [];
  let outgoing = [];
  let friendsOnlineStatus = {};

  const emit = () => {
    const friendsWithStatus = friends.map((friend) => ({
      ...friend,
      online: friendsOnlineStatus[friend.friendId] || false,
    }));
    const friendIds = new Set(friends.map((entry) => entry.friendId));
    const outgoingIds = new Set(outgoing.map((entry) => entry.toUserId));
    const incomingIds = new Set(incoming.map((entry) => entry.fromUserId));
    onData({ friends: friendsWithStatus, incoming, outgoing, friendIds, outgoingIds, incomingIds });
  };

  const unsubFriends = onSnapshot(friendsQuery, (snapshot) => {
    friends = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    
    // Subscribe to online status for each friend
    friends.forEach((friend) => {
      if (!friendsOnlineStatus.hasOwnProperty(friend.friendId)) {
        const userRef = doc(db, "users", friend.friendId);
        onSnapshot(userRef, (userSnap) => {
          const userData = userSnap.data();
          friendsOnlineStatus[friend.friendId] = Boolean(userData?.isOnline);
          emit();
        });
      }
    });
    
    emit();
  });

  const unsubIncoming = onSnapshot(incomingQuery, (snapshot) => {
    incoming = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    emit();
  });

  const unsubOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
    outgoing = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
    emit();
  });

  return () => {
    unsubFriends();
    unsubIncoming();
    unsubOutgoing();
  };
}

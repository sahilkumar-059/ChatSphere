import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, collection } from "firebase/firestore";
import { auth, db, provider } from "../firebase";

const DEFAULT_BIO = "Building something better than chat apps.";

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
};

export function getAuthErrorMessage(error) {
  const code = error?.code || "";
  return AUTH_ERROR_MESSAGES[code] || error?.message || "Something went wrong. Please try again.";
}

export async function createUserProfile(user, profileData = {}) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    await setDoc(
      userRef,
      {
        isOnline: true,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );
    return snapshot.data();
  }

  const username =
    profileData.username ||
    user.email?.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "") ||
    `user_${user.uid.slice(0, 6)}`;

  const userDoc = {
    uid: user.uid,
    fullName: profileData.fullName || user.displayName || "ChatSphere User",
    username,
    email: user.email || "",
    photoURL: profileData.photoURL || user.photoURL || "",
    bio: profileData.bio || DEFAULT_BIO,
    isOnline: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, userDoc);
  return userDoc;
}

export async function signUpWithEmail({ fullName, username, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: fullName.trim() });
  await createUserProfile(credential.user, {
    fullName: fullName.trim(),
    username: username.trim().toLowerCase(),
  });
  return credential.user;
}

export async function signInWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await createUserProfile(credential.user);
  return credential.user;
}

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, provider);
  await createUserProfile(credential.user);
  return credential.user;
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser() {
  const currentUser = auth.currentUser;
  if (currentUser) {
    await setDoc(
      doc(db, "users", currentUser.uid),
      { isOnline: false, lastSeen: serverTimestamp() },
      { merge: true }
    ).catch(() => {});
  }
  await signOut(auth);
}

// Check if a username is available
export async function checkUsernameAvailability(username) {
  const trimmedUsername = username.trim().toLowerCase();
  const q = query(collection(db, "users"), where("username", "==", trimmedUsername));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

// Save username for a new user
export async function saveUsername(user, username) {
  const trimmedUsername = username.trim().toLowerCase();
  
  // Check availability again
  const isAvailable = await checkUsernameAvailability(trimmedUsername);
  if (!isAvailable) {
    throw new Error("Username is already taken");
  }

  const userDoc = {
    uid: user.uid,
    fullName: user.displayName || "ChatSphere User",
    username: trimmedUsername,
    email: user.email || "",
    photoURL: user.photoURL || "",
    bio: DEFAULT_BIO,
    isOnline: true,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, "users", user.uid), userDoc);
  return userDoc;
}

// Update username for existing user
export async function updateUsername(userId, newUsername) {
  const trimmedUsername = newUsername.trim().toLowerCase();
  
  // Check availability
  const isAvailable = await checkUsernameAvailability(trimmedUsername);
  if (!isAvailable) {
    throw new Error("Username is already taken");
  }

  await updateDoc(doc(db, "users", userId), { username: trimmedUsername, updatedAt: serverTimestamp() });
}

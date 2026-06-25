import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { auth, db, provider, storage } from "./firebase";
import Sidebar from "./components/Sidebar";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import Settings from "./components/Settings";
import "./App.css";

const chats = [
  { id: "aman", name: "Aman", avatar: "A", online: true, lastMessage: "Bro meeting kab hai?", lastTime: "10:45 AM", unread: 2 },
  { id: "priya", name: "Priya", avatar: "P", online: false, lastMessage: "Call me when free", lastTime: "09:20 AM", unread: 0 },
  { id: "rohit", name: "Rohit", avatar: "R", online: true, lastMessage: "Project push kar diya", lastTime: "Yesterday", unread: 5 },
];

const seedMessages = [
  {
    id: "seed-aman-1",
    chatId: "aman",
    senderId: "aman",
    senderName: "Aman",
    text: "bhai kab hai?",
    type: "text",
    status: "delivered",
    timeLabel: "10:40 PM",
    order: 1,
  },
  {
    id: "seed-me-1",
    chatId: "aman",
    senderId: "me",
    senderName: "You",
    text: "11 baje start hogi",
    type: "text",
    status: "seen",
    timeLabel: "10:41 PM",
    order: 2,
  },
  {
    id: "seed-aman-2",
    chatId: "aman",
    senderId: "aman",
    senderName: "Aman",
    text: "Perfect 👍",
    type: "text",
    status: "delivered",
    timeLabel: "10:42 PM",
    order: 3,
  },
  {
    id: "seed-priya-1",
    chatId: "priya",
    senderId: "priya",
    senderName: "Priya",
    text: "Call me when free",
    type: "text",
    status: "delivered",
    timeLabel: "09:20 AM",
    order: 4,
  },
  {
    id: "seed-rohit-1",
    chatId: "rohit",
    senderId: "rohit",
    senderName: "Rohit",
    text: "Project push kar diya",
    type: "text",
    status: "delivered",
    timeLabel: "Yesterday",
    order: 5,
  },
];

const defaultSettings = {
  themeMode: "dark",
  notificationsEnabled: true,
  readReceiptsEnabled: true,
  wallpaper: "aurora",
};

const formatTimeLabel = (value) => {
  if (!value) return "";
  if (value?.toDate) return value.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (value instanceof Date) return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return String(value);
};

const readStoredSettings = () => {
  try {
    const stored = localStorage.getItem("chatsphere-settings");
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({ bio: "Building something better than chat apps." });
  const [settings, setSettings] = useState(readStoredSettings);
  const [activeTab, setActiveTab] = useState("Chats");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [searchChats, setSearchChats] = useState("");
  const [selectedChat, setSelectedChat] = useState(chats[0]);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("Aman");
  const [messages, setMessages] = useState(seedMessages);
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSeen, setLastSeen] = useState("just now");
  const [dragPreview, setDragPreview] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimerRef = useRef(null);

  const currentChatId = selectedChat.id;

  useEffect(() => {
    localStorage.setItem("chatsphere-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.body.classList.toggle("light-theme", settings.themeMode === "light");
    document.body.classList.toggle("dark-theme", settings.themeMode === "dark");
  }, [settings.themeMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);

      if (!nextUser) return;

      await setDoc(
        doc(db, "users", nextUser.uid),
        {
          uid: nextUser.uid,
          displayName: nextUser.displayName || "ChatSphere user",
          email: nextUser.email || "",
          photoURL: nextUser.photoURL || "",
          bio: profile.bio,
          isOnline: true,
          lastSeen: serverTimestamp(),
          themeMode: settings.themeMode,
          notificationsEnabled: settings.notificationsEnabled,
          readReceiptsEnabled: settings.readReceiptsEnabled,
          wallpaper: settings.wallpaper,
        },
        { merge: true }
      );
    });

    return () => unsubscribe();
  }, [profile.bio, settings.notificationsEnabled, settings.readReceiptsEnabled, settings.themeMode, settings.wallpaper]);

  useEffect(() => {
    if (!user) return undefined;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data() || {};
      setProfile({ bio: data.bio || "Building something better than chat apps." });
      setSettings((current) => ({
        ...current,
        themeMode: data.themeMode || current.themeMode,
        notificationsEnabled: typeof data.notificationsEnabled === "boolean" ? data.notificationsEnabled : current.notificationsEnabled,
        readReceiptsEnabled: typeof data.readReceiptsEnabled === "boolean" ? data.readReceiptsEnabled : current.readReceiptsEnabled,
        wallpaper: data.wallpaper || current.wallpaper,
      }));
      setOnline(Boolean(data.isOnline));
      setLastSeen(data.lastSeen ? "a moment ago" : "just now");
    });

    const markPresence = async (isOnline) => {
      await setDoc(userRef, { isOnline, lastSeen: serverTimestamp() }, { merge: true });
    };

    const handleOnline = () => {
      setOnline(true);
      markPresence(true).catch(() => {});
    };

    const handleOffline = () => {
      setOnline(false);
      markPresence(false).catch(() => {});
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    markPresence(true).catch(() => {});

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      markPresence(false).catch(() => {});
    };
  }, [user]);

  useEffect(() => {
    if (!user || !settings.notificationsEnabled || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [settings.notificationsEnabled, user]);

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nextMessages = snapshot.docs.map((messageDoc) => ({
        id: messageDoc.id,
        ...messageDoc.data(),
        order: messageDoc.data().createdAt?.toMillis?.() || Date.now(),
        timeLabel: formatTimeLabel(messageDoc.data().createdAt || messageDoc.data().timeLabel),
      }));

      setMessages((current) => {
        const merged = new Map(current.map((message) => [message.id, message]));
        const serverClientKeys = new Set(nextMessages.map((message) => message.clientKey).filter(Boolean));

        Array.from(merged.values())
          .filter((message) => serverClientKeys.has(message.clientKey))
          .forEach((message) => merged.delete(message.id));

        nextMessages.forEach((message) => {
          const existing = merged.get(message.id) || {};
          merged.set(message.id, { ...existing, ...message });
        });

        return Array.from(merged.values()).sort((left, right) => (left.order || 0) - (right.order || 0));
      });

      const unread = nextMessages.filter((message) => message.chatId === currentChatId && message.senderId !== user?.uid && message.status !== "seen");
      setNotificationCount(unread.length);

      if (settings.notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        unread.forEach((message) => {
          new Notification(message.senderName || "New message", {
            body: message.text || (message.type === "image" ? "Shared an image" : "New message"),
          });
        });
      }
    });

    return () => unsubscribe();
  }, [currentChatId, settings.notificationsEnabled, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat, isTyping]);

  const filteredChats = useMemo(() => {
    const keyword = searchChats.trim().toLowerCase();
    return chats
      .map((chat) => {
        const chatMessages = messages.filter((message) => message.chatId === chat.id);
        const lastMessage = chatMessages[chatMessages.length - 1];
        return {
          ...chat,
          unread: chatMessages.filter((message) => message.senderId !== user?.uid && message.status !== "seen").length,
          lastMessage: lastMessage?.text || chat.lastMessage,
          lastMessagePreview: lastMessage?.text || chat.lastMessage,
          lastTime: lastMessage?.timeLabel || chat.lastTime,
          online: chat.online,
        };
      })
      .filter((chat) => !keyword || `${chat.name} ${chat.lastMessagePreview}`.toLowerCase().includes(keyword));
  }, [messages, searchChats, user?.uid]);

  const visibleMessages = useMemo(() => {
    return messages.filter((message) => message.chatId === currentChatId);
  }, [messages, currentChatId]);

  useEffect(() => {
    if (!user) return;
    const unreadSeenMessages = visibleMessages.filter((message) => message.senderId !== user.uid && message.status !== "seen");
    unreadSeenMessages.forEach((message) => {
      updateDoc(doc(db, "messages", message.id), { status: "seen", seenAt: serverTimestamp() }).catch(() => {});
    });
  }, [user, visibleMessages]);

  const login = async () => {
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    if (user) {
      await setDoc(doc(db, "users", user.uid), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(() => {});
    }
    setShowSettings(false);
    await signOut(auth);
  };

  const openSettings = () => {
    setActiveTab("Settings");
    setShowSettings(true);
  };

  const updateProfile = (nextProfile) => setProfile(nextProfile);

  const updateSettings = (patch) => setSettings((current) => ({ ...current, ...patch }));

  const saveProfile = async () => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { ...profile, ...settings, updatedAt: serverTimestamp() }, { merge: true });
    setShowSettings(false);
  };

  const handleTyping = () => {
    setIsTyping(true);
    setTypingUser(selectedChat.name);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1200);
  };

  const sendMessage = async ({ text, type = "text", imageUrl = "", audioUrl = "" } = {}) => {
    const activeUser = user || {
      uid: "guest",
      displayName: "You",
      photoURL: "",
      email: "",
    };
    const resolvedText = typeof text === "string" ? text : messageInput;
    if (!resolvedText.trim() && !imageUrl && !audioUrl) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      clientKey: tempId,
      chatId: currentChatId,
      senderId: activeUser.uid,
      senderName: activeUser.displayName || "You",
      senderPhotoURL: activeUser.photoURL || "",
      text: resolvedText.trim(),
      imageUrl,
      audioUrl,
      type,
      status: "sent",
      order: Date.now(),
      timeLabel: formatTimeLabel(new Date()),
    };

    setMessages((current) => [...current, optimisticMessage].sort((left, right) => (left.order || 0) - (right.order || 0)));

    const messagePayload = {
      chatId: currentChatId,
      senderId: activeUser.uid,
      senderName: activeUser.displayName || "You",
      senderPhotoURL: activeUser.photoURL || "",
      text: resolvedText.trim(),
      imageUrl,
      audioUrl,
      type,
      status: "sent",
      clientKey: tempId,
      createdAt: serverTimestamp(),
      order: Date.now(),
      timeLabel: formatTimeLabel(new Date()),
    };

    const docRef = await addDoc(collection(db, "messages"), messagePayload);
    setMessages((current) => current.map((message) => (message.id === tempId ? { ...message, id: docRef.id } : message)));
    setMessageInput("");
    setIsTyping(false);

    setTimeout(() => updateDoc(doc(db, "messages", docRef.id), { status: "delivered" }).catch(() => {}), 850);
    setTimeout(() => {
      if (settings.readReceiptsEnabled) {
        updateDoc(doc(db, "messages", docRef.id), { status: "seen", seenAt: serverTimestamp() }).catch(() => {});
      }
    }, 1600);
  };

  const uploadFileAndSend = async (file, mediaType = "image") => {
    if (!user || !file) return;
    const uploadRef = storageRef(storage, `chat-uploads/${user.uid}/${Date.now()}-${file.name}`);
    await uploadBytes(uploadRef, file);
    const downloadUrl = await getDownloadURL(uploadRef);
    await sendMessage({
      text: mediaType === "audio" ? "Voice message" : "",
      type: mediaType,
      imageUrl: mediaType === "image" ? downloadUrl : "",
      audioUrl: mediaType === "audio" ? downloadUrl : "",
    });
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadFileAndSend(file, file.type.startsWith("audio/") ? "audio" : "image");
  };

  const toggleRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      stream.getTracks().forEach((track) => track.stop());
      await uploadFileAndSend(file, "audio");
    };

    recorder.start();
    setIsRecording(true);
  };

  const handleMarkSeen = async () => {
    if (!user) return;
    const unseen = messages.filter((message) => message.chatId === currentChatId && message.senderId !== user.uid && message.status !== "seen");
    await Promise.all(unseen.map((message) => updateDoc(doc(db, "messages", message.id), { status: "seen" })));
  };

  const currentPresence = online ? "Online now" : `Last seen ${lastSeen}`;

  return (
    <div className={`app-shell theme-${settings.themeMode}`}>
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={openSettings}
        onLogin={login}
        onLogout={logout}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        sidebarOpen={sidebarOpen}
        unreadCount={notificationCount}
      />

      <div className="app-content">
        <ChatList
          chats={filteredChats}
          searchChats={searchChats}
          onSearchChats={setSearchChats}
          selectedChatId={currentChatId}
          onSelectChat={setSelectedChat}
        />

        <ChatWindow
          user={user}
          chat={selectedChat}
          messages={visibleMessages}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          isTyping={isTyping}
          typingUser={typingUser}
          onImageUpload={() => fileInputRef.current?.click()}
          onDropFiles={(files) => {
            const file = files?.[0];
            if (file) uploadFileAndSend(file, file.type.startsWith("audio/") ? "audio" : "image");
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragPreview("Drop files to upload");
          }}
          dragPreview={dragPreview}
          onRecordToggle={toggleRecording}
          isRecording={isRecording}
          messagesEndRef={messagesEndRef}
          onMarkSeen={handleMarkSeen}
          currentUserPresence={currentPresence}
        />
      </div>

      {showSettings ? (
        <Settings
          user={user}
          profile={profile}
          settings={settings}
          onProfileChange={updateProfile}
          onToggleTheme={() => updateSettings({ themeMode: settings.themeMode === "dark" ? "light" : "dark" })}
          onToggleNotifications={() => updateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
          onToggleReadReceipts={() => updateSettings({ readReceiptsEnabled: !settings.readReceiptsEnabled })}
          onWallpaperChange={(wallpaper) => updateSettings({ wallpaper })}
          onSaveProfile={saveProfile}
          onLogout={logout}
          online={online}
          lastSeenLabel={lastSeen}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      <input ref={fileInputRef} type="file" accept="image/*,audio/*" hidden onChange={handleImageUpload} />
    </div>
  );
}

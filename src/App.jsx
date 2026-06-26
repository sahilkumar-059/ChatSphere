import { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import Settings from "./components/Settings";
import SearchFriendsModal from "./components/friends/SearchFriendsModal";
import FriendRequestsPage from "./components/friends/FriendRequestsPage";
import { subscribeFriendData } from "./services/friendService";
import { getOrCreateChatRoom, sendMessage as sendChatMessage, subscribeToMessages, subscribeToUserChats } from "./services/chatService";
import "./App.css";


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

// Generate a unique chat ID for two users (sorted to ensure consistency)
function getChatId(userId1, userId2) {
  if (!userId1 || !userId2) return "";
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

const readStoredSettings = () => {
  try {
    const stored = localStorage.getItem("chatsphere-settings");
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
};

export default function App() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({ bio: "Building something better than chat apps.", username: "" });
  const [settings, setSettings] = useState(readStoredSettings);
  const [activeTab, setActiveTab] = useState("Chats");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchFriends, setShowSearchFriends] = useState(false);
  const [friendData, setFriendData] = useState({
    friends: [],
    incoming: [],
    outgoing: [],
    friendIds: new Set(),
    outgoingIds: new Set(),
    incomingIds: new Set(),
  });
  const [searchChats, setSearchChats] = useState("");
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [messages, setMessages] = useState([]);
  const [userChats, setUserChats] = useState([]);
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

  const currentChatId = selectedChat?.chatId || getChatId(user?.uid, selectedChat?.id || selectedChat?.friendId);

  const handleSelectChat = async (chat) => {
    if (!user) return;
    
    const friendId = chat.friendId || chat.id;
    const chatId = await getOrCreateChatRoom(user.uid, friendId);
    
    setSelectedChat({
      ...chat,
      id: friendId,
      friendId,
      chatId,
    });
  };

  useEffect(() => {
    localStorage.setItem("chatsphere-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.body.classList.toggle("light-theme", settings.themeMode === "light");
    document.body.classList.toggle("dark-theme", settings.themeMode === "dark");
  }, [settings.themeMode]);

  useEffect(() => {
    if (!user) return undefined;

    const userRef = doc(db, "users", user.uid);
    setDoc(
      userRef,
      {
        themeMode: settings.themeMode,
        notificationsEnabled: settings.notificationsEnabled,
        readReceiptsEnabled: settings.readReceiptsEnabled,
        wallpaper: settings.wallpaper,
        bio: profile.bio,
      },
      { merge: true }
    ).catch(() => {});
  }, [user, profile.bio, settings.notificationsEnabled, settings.readReceiptsEnabled, settings.themeMode, settings.wallpaper]);

  useEffect(() => {
    if (!user) return undefined;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      const data = snapshot.data() || {};
      setProfile({
        bio: data.bio || "Building something better than chat apps.",
        username: data.username || "",
      });
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
    if (!user?.uid) return undefined;
    return subscribeFriendData(user.uid, setFriendData);
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !settings.notificationsEnabled || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [settings.notificationsEnabled, user]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToUserChats(user.uid, (chats) => {
      setUserChats(chats);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!currentChatId || !user?.uid) return undefined;
    return subscribeToMessages(currentChatId, (messages) => {
      setMessages(messages);
      const unread = messages.filter((message) => message.senderId !== user.uid && message.status !== "seen");
      setNotificationCount(unread.length);

      if (settings.notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        unread.forEach((message) => {
          new Notification(message.senderName || "New message", {
            body: message.text || (message.type === "image" ? "Shared an image" : "New message"),
          });
        });
      }
    });
  }, [currentChatId, settings.notificationsEnabled, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat, isTyping]);

  const filteredChats = useMemo(() => {
    const keyword = searchChats.trim().toLowerCase();
    return friendData.friends
      .map((friend) => {
        const chatId = getChatId(user?.uid, friend.friendId);
        const chatRoom = userChats.find((chat) => chat.id === chatId);
        const chatMessages = messages.filter((message) => message.chatId === chatId);
        const lastMessage = chatMessages[chatMessages.length - 1];
        return {
          id: friend.friendId,
          name: friend.friendFullName,
          avatar: friend.friendPhotoURL || friend.friendFullName?.charAt(0) || "?",
          online: friend.online || false,
          lastMessage: lastMessage?.text || chatRoom?.lastMessage || "No messages yet",
          lastMessagePreview: lastMessage?.text || chatRoom?.lastMessage || "No messages yet",
          lastTime: lastMessage?.timeLabel || formatTimeLabel(chatRoom?.lastMessageTime) || "",
          unread: chatMessages.filter((message) => message.senderId !== user?.uid && message.status !== "seen").length,
          friendId: friend.friendId,
        };
      })
      .filter((chat) => !keyword || `${chat.name} ${chat.lastMessagePreview}`.toLowerCase().includes(keyword));
  }, [friendData.friends, userChats, messages, searchChats, user?.uid]);

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

  const handleLogout = async () => {
    setShowSettings(false);
    await logout();
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
    setTypingUser(selectedChat?.name || "");
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 1200);
  };

  const sendMessage = async ({ text, type = "text", imageUrl = "", audioUrl = "" } = {}) => {
    if (!user || !selectedChat) return;
    
    const resolvedText = typeof text === "string" ? text : messageInput;
    if (!resolvedText.trim() && !imageUrl && !audioUrl) return;

    // Get or create chat room
    const chatId = await getOrCreateChatRoom(user.uid, selectedChat.friendId || selectedChat.id);
    
    // Update selected chat with the correct chatId
    setSelectedChat((prev) => ({ ...prev, chatId }));

    const messagePayload = {
      senderId: user.uid,
      senderName: user.displayName || "You",
      senderPhotoURL: user.photoURL || "",
      text: resolvedText.trim(),
      imageUrl,
      audioUrl,
      type,
    };

    await sendChatMessage(chatId, messagePayload);
    setMessageInput("");
    setIsTyping(false);
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
  const isFriendsView = activeTab === "Friends";

  return (
    <div className={`app-shell theme-${settings.themeMode}`}>
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={openSettings}
        onOpenSearchFriends={() => setShowSearchFriends(true)}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
        sidebarOpen={sidebarOpen}
        unreadCount={notificationCount}
        incomingFriendCount={friendData.incoming.length}
      />

      <div className={`app-content ${isFriendsView ? "friends-active" : ""}`}>
        {isFriendsView ? (
          <FriendRequestsPage
            friendData={friendData}
            onOpenSearch={() => setShowSearchFriends(true)}
          />
        ) : (
          <>
            <ChatList
              chats={filteredChats}
              friends={friendData.friends}
              searchChats={searchChats}
              onSearchChats={setSearchChats}
              selectedChatId={currentChatId}
              onSelectChat={handleSelectChat}
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
          </>
        )}
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
          onLogout={handleLogout}
          online={online}
          lastSeenLabel={lastSeen}
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      {showSearchFriends ? (
        <SearchFriendsModal
          user={user}
          friendData={{
            ...friendData,
            currentUsername: profile.username,
          }}
          onClose={() => setShowSearchFriends(false)}
        />
      ) : null}

      <input ref={fileInputRef} type="file" accept="image/*,audio/*" hidden onChange={handleImageUpload} />
    </div>
  );
}

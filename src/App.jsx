import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import ChatList from "./components/ChatList";
import ChatWindow from "./components/ChatWindow";
import Settings from "./components/Settings";
import UsernameSetup from "./components/UsernameSetup";
import UniqueIdSetup from "./components/UniqueIdSetup";
import EditUsernameModal from "./components/EditUsernameModal";
import SearchFriendsModal from "./components/friends/SearchFriendsModal";
import FriendRequestsPage from "./components/friends/FriendRequestsPage";
import IncomingCallModal from "./components/IncomingCallModal";
import CallWindow from "./components/CallWindow";
import { subscribeFriendData } from "./services/friendService";
import { getOrCreateChatRoom, loadMessages, sendMessage as sendChatMessage, subscribeToMessages, subscribeToUserChats } from "./services/chatService";
import { initiateCall, subscribeToCall, subscribeToIceCandidates, addIceCandidate, setRemoteDescription, stopAllStreams, cleanupCall, generateCallId } from "./services/callService";
import { createCallRecord, markCallAnswered, markCallRejected, markCallEnded, markCallMissed } from "./services/callHistoryService";
import CallsPage from "./components/CallsPage";
import NotificationsPage from "./components/NotificationsPage";
import { subscribeToUnreadCountSummary, resetChatUnreadCount } from "./services/notificationService";
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
  const [profile, setProfile] = useState({ bio: "Building something better than chat apps.", username: "", displayName: "", phone: "", status: "online", photoURL: "", location: "", birthday: "" });
  const [settings, setSettings] = useState(readStoredSettings);
  const [activeTab, setActiveTab] = useState("Chats");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearchFriends, setShowSearchFriends] = useState(false);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);
  const [showUniqueIdSetup, setShowUniqueIdSetup] = useState(false);
  const [showEditUsername, setShowEditUsername] = useState(false);
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
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [, setCallState] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimerRef = useRef(null);
  const callUnsubscribeRef = useRef(null);
  const iceCandidatesUnsubscribeRef = useRef(null);

  const currentChatId = selectedChat?.chatId || getChatId(user?.uid, selectedChat?.friendId || selectedChat?.id);

  const handleSelectChat = async (chat) => {
    if (!user) return;
    
    const friendId = chat.friendId || chat.id;
    // Always ensure the chat room exists and get the correct chatId
    const chatId = await getOrCreateChatRoom(user.uid, friendId);
    
    console.log("=== CHAT SELECTED ===");
    console.log("friendId:", friendId);
    console.log("chatId from getOrCreateChatRoom:", chatId);
    console.log("chat.chatId from props:", chat.chatId);
    console.log("Setting selectedChat.chatId to:", chatId);
    
    setSelectedChat({
      ...chat,
      id: friendId,
      friendId,
      chatId,
    });
    
    // Reset unread count for this chat when opening it
    if (chatId && user?.uid) {
      resetChatUnreadCount(user.uid, chatId).catch(() => {});
    }
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
        uniqueId: data.uniqueId || "",
        displayName: data.displayName || user?.displayName || "",
        phone: data.phone || "",
        status: data.status || "online",
        photoURL: data.photoURL || user?.photoURL || "",
        location: data.location || "",
        birthday: data.birthday || "",
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
      
      // Check if user needs to create a Unique ID
      if (user && !data.uniqueId) {
        setShowUniqueIdSetup(true);
      } else if (user && data.uniqueId) {
        setShowUniqueIdSetup(false);
      }
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

  // Subscribe to real-time unread count from notificationSummary
  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToUnreadCountSummary(user.uid, (count) => {
      setNotificationCount(count);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!currentChatId || !user?.uid) return undefined;
    console.log("=== SUBSCRIBING TO MESSAGES ===");
    console.log("currentChatId:", currentChatId);
    console.log("user.uid:", user.uid);

    let cancelled = false;

    loadMessages(currentChatId)
      .then((initialMessages) => {
        if (!cancelled) {
          setMessages(initialMessages);
        }
      })
      .catch((error) => {
        console.error("loadMessages error:", error);
      });
    
    const unsubscribe = subscribeToMessages(currentChatId, (chatMessages) => {
      console.log("=== MESSAGES RECEIVED ===");
      console.log("For chatId:", currentChatId);
      console.log("Number of messages:", chatMessages.length);
      console.log("Messages:", chatMessages);
      if (!cancelled) {
        setMessages(chatMessages);
      }

      // Show browser notifications for new messages in the open chat
      if (settings.notificationsEnabled && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const unseen = chatMessages.filter(
          (message) => message.senderId !== user.uid && message.status !== "seen"
        );
        unseen.forEach((message) => {
          new Notification(message.senderName || "New message", {
            body: message.text || (message.type === "image" ? "Shared an image" : "New message"),
          });
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentChatId, settings.notificationsEnabled, user?.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedChat, isTyping]);

  // Subscribe to incoming calls
  useEffect(() => {
    if (!user?.uid) return;

    const callsRef = collection(db, "calls");
    const q = query(callsRef, where("calleeId", "==", user.uid), where("status", "==", "calling"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const callData = change.doc.data();
        
        if (change.type === "added") {
          // Get caller's display name
          getDoc(doc(db, "users", callData.callerId)).then((userDoc) => {
            const callerData = userDoc.data();
            // Get receiver's (current user's) display name
            getDoc(doc(db, "users", user.uid)).then((myUserDoc) => {
              const myData = myUserDoc.data();
              
              // If the caller did NOT create a call history record, create one for the receiver
              let recordPromise;
              if (callData.callHistoryRecordId) {
                recordPromise = Promise.resolve(callData.callHistoryRecordId);
              } else {
                recordPromise = createCallRecord({
                  callerId: callData.callerId,
                  receiverId: user.uid,
                  callerName: callerData?.displayName || callerData?.username || "Unknown",
                  receiverName: myData?.displayName || myData?.username || user.displayName || "Unknown",
                  callerPhoto: callerData?.photoURL || "",
                  receiverPhoto: myData?.photoURL || "",
                  callType: callData.videoEnabled ? "video" : "voice",
                  direction: "incoming",
                });
              }
              
              recordPromise.then((recordId) => {
                setIncomingCall((prev) => {
                  // Only set if we haven't already dismissed it
                  if (prev === null || prev.callId === change.doc.id) {
                    return {
                      callId: change.doc.id,
                      callHistoryRecordId: recordId,
                      ...callData,
                      callerDisplayName: callerData?.displayName || callerData?.username || "Unknown",
                    };
                  }
                  return prev;
                });
              });
            });
          });
        } else if (change.type === "modified" && callData?.status !== "calling") {
          // Caller cancelled or ended while ringing -> mark as missed
          setIncomingCall((prev) => {
            if (prev && prev.callId === change.doc.id && prev.callHistoryRecordId) {
              markCallMissed(prev.callHistoryRecordId);
            }
            return null;
          });
        } else if (change.type === "removed") {
          // Caller deleted the signaling doc without answering -> missed
          setIncomingCall((prev) => {
            if (prev && prev.callId === change.doc.id && prev.callHistoryRecordId) {
              markCallMissed(prev.callHistoryRecordId);
            }
            return null;
          });
        }
      });
    });

    return unsubscribe;
  }, [user?.uid]);

  // Subscribe to call state changes
  useEffect(() => {
    if (!activeCall?.callId) return;

    if (callUnsubscribeRef.current) {
      callUnsubscribeRef.current();
    }

    callUnsubscribeRef.current = subscribeToCall(activeCall.callId, (callData) => {
      setCallState(callData);

      if (callData?.answer && !callData.remoteDescriptionSet) {
        setRemoteDescription(activeCall.callId, callData.answer);
      }

      if (callData?.status === "ended") {
        // Update history on end
        if (activeCall.callHistoryRecordId) {
          markCallEnded(activeCall.callHistoryRecordId);
        }
        setActiveCall(null);
        setCallState(null);
        stopAllStreams();
        cleanupCall(activeCall.callId);
      } else if (callData?.status === "rejected") {
        // Only caller sees this - the receiver already marked as rejected
        // If the caller hasn't already marked it, do it here
        if (activeCall.callHistoryRecordId) {
          markCallRejected(activeCall.callHistoryRecordId);
        }
        setActiveCall(null);
        setCallState(null);
        stopAllStreams();
        cleanupCall(activeCall.callId);
      }
    });

    return () => {
      if (callUnsubscribeRef.current) {
        callUnsubscribeRef.current();
      }
    };
  }, [activeCall?.callId]);

  // Subscribe to ICE candidates
  useEffect(() => {
    if (!activeCall?.callId) return;

    if (iceCandidatesUnsubscribeRef.current) {
      iceCandidatesUnsubscribeRef.current();
    }

    iceCandidatesUnsubscribeRef.current = subscribeToIceCandidates(
      activeCall.callId,
      (candidate) => {
        addIceCandidate(activeCall.callId, candidate);
      }
    );

    return () => {
      if (iceCandidatesUnsubscribeRef.current) {
        iceCandidatesUnsubscribeRef.current();
      }
    };
  }, [activeCall?.callId]);

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
          chatId: chatId, // Add the actual chatId
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
    if (!currentChatId) return [];
    return messages.filter((message) => message.chatId === currentChatId);
  }, [messages, currentChatId]);

  // When a new message arrives for the currently open chat, reset its unread count
  useEffect(() => {
    if (!currentChatId || !user?.uid) return;
    const lastMessage = visibleMessages[visibleMessages.length - 1];
    if (lastMessage && lastMessage.senderId !== user.uid) {
      resetChatUnreadCount(user.uid, currentChatId).catch(() => {});
    }
  }, [visibleMessages, currentChatId, user?.uid]);

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

  const openUsernameSetup = () => {
    setShowUsernameSetup(true);
  };

  const openEditUsername = () => {
    setShowEditUsername(true);
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

  const startCall = async (isVideoCall = true) => {
    if (!user || !selectedChat) return;

    if (!friendData.friendIds.has(selectedChat?.id || selectedChat?.friendId)) {
      return; // Non-friends - button should be disabled
    }

    try {
      const callId = generateCallId(user.uid, selectedChat.id || selectedChat.friendId);
      
      // Create call history record FIRST
      const friendId = selectedChat.id || selectedChat.friendId;
      const friendInfo = friendData.friends.find(f => f.friendId === friendId);
      
      const historyRecordId = await createCallRecord({
        callerId: user.uid,
        receiverId: friendId,
        callerName: user.displayName || profile.username || "Unknown",
        receiverName: selectedChat.name || friendInfo?.friendFullName || "Unknown",
        callerPhoto: user.photoURL || "",
        receiverPhoto: friendInfo?.friendPhotoURL || "",
        callType: isVideoCall ? "video" : "voice",
        direction: "outgoing",
      });

      await initiateCall(
        callId,
        user.uid,
        friendId,
        selectedChat.name,
        isVideoCall
      );

      // Store the history record ID in the signaling doc so the receiver can use it
      if (historyRecordId) {
        await updateDoc(doc(db, "calls", callId), {
          callHistoryRecordId: historyRecordId,
        });
      }

      setActiveCall({
        callId,
        callHistoryRecordId: historyRecordId,
        isInitiator: true,
        remoteName: selectedChat.name,
        videoEnabled: isVideoCall,
      });
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      // Mark the call as answered in history
      if (incomingCall.callHistoryRecordId) {
        await markCallAnswered(incomingCall.callHistoryRecordId);
      }

      setActiveCall({
        callId: incomingCall.callId,
        callHistoryRecordId: incomingCall.callHistoryRecordId,
        isInitiator: false,
        remoteName: incomingCall.callerDisplayName,
        videoEnabled: incomingCall.videoEnabled || true,
      });
      setIncomingCall(null);
    } catch (error) {
      console.error("Error accepting call:", error);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall?.callHistoryRecordId) {
      markCallRejected(incomingCall.callHistoryRecordId);
    }
    setIncomingCall(null);
  };

  const handleCallEnd = async () => {
    if (activeCall?.callId) {
      if (activeCall.callHistoryRecordId) {
        await markCallEnded(activeCall.callHistoryRecordId);
      }
      stopAllStreams();
      cleanupCall(activeCall.callId);
    }
    setActiveCall(null);
    setCallState(null);
  };

  const sendMessage = async (options = {}) => {
    if (!user || !selectedChat) {
      console.error("sendMessage: Missing user or selectedChat", { user, selectedChat });
      return;
    }
    
    // Handle case where React click event is passed instead of options object
    const opts = options?.nativeEvent ? {} : options;
    const { text, type = "text", imageUrl = "", audioUrl = "", documentUrl = "", fileName = "", fileSize = 0, mimeType = "" } = opts;
    const resolvedText = typeof text === "string" ? text : messageInput;
    
    // Allow sending if there's text, image, audio, or document content
    const hasContent = resolvedText.trim() || imageUrl || audioUrl || documentUrl;
    if (!hasContent) return;

    // Use the existing chatId from selectedChat
    const chatId = currentChatId;
    const receiverId = selectedChat.id || selectedChat.friendId;
    
    if (!chatId) {
      console.error("sendMessage: Missing chatId in selectedChat", selectedChat);
      return;
    }
    
    console.log("=== SENDING MESSAGE ===");
    console.log("chatId:", chatId);
    console.log("text:", resolvedText);
    console.log("selectedChat:", selectedChat);

    const messagePayload = {
      senderId: user.uid,
      senderName: user.displayName || "You",
      senderPhotoURL: user.photoURL || "",
      text: resolvedText.trim(),
      imageUrl,
      audioUrl,
      documentUrl,
      fileName,
      fileSize,
      mimeType,
      type,
      receiverId,
    };

    const clientKey = `${user.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage = {
      id: `temp-${clientKey}`,
      chatId,
      clientKey,
      ...messagePayload,
      createdAt: new Date(),
      timeLabel: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    setMessages((currentMessages) => {
      return [...currentMessages, optimisticMessage];
    });

    try {
      await sendChatMessage(chatId, { ...messagePayload, clientKey });
      setMessageInput("");
      setIsTyping(false);
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== optimisticMessage.id && message.clientKey !== clientKey)
      );
    }
  };

  const uploadFileAndSend = async (file, mediaType = "image") => {
    if (!user || !file) {
      console.error("uploadFileAndSend: Missing user or file");
      alert("Error: User not authenticated or no file provided");
      return;
    }
    
    const fileName = file.name;
    const fileSize = file.size;
    const mimeType = file.type;

    console.log("uploadFileAndSend: Starting upload", { fileName, fileSize, mimeType, mediaType });

    // Upload to Firebase Storage
    let downloadUrl = null;
    try {
      const uploadPath = `chat-uploads/${user.uid}/${Date.now()}-${fileName}`;
      const uploadRef = storageRef(storage, uploadPath);
      console.log("uploadFileAndSend: Uploading to", uploadPath);
      
      await uploadBytes(uploadRef, file);
      downloadUrl = await getDownloadURL(uploadRef);
      console.log(`uploadFileAndSend: Upload successful, got URL`);
    } catch (uploadError) {
      console.error("uploadFileAndSend: Upload failed:", uploadError);
      alert(`Upload failed: ${uploadError.message}`);
      return;
    }

    // Build message payload with download URL based on media type
    let messagePayload;
    if (mediaType === "image") {
      messagePayload = { type: "image", imageUrl: downloadUrl, text: "" };
    } else if (mediaType === "video") {
      messagePayload = { type: "video", imageUrl: downloadUrl, text: "📹 Video" };
    } else if (mediaType === "audio" || mediaType === "voice") {
      messagePayload = { type: "audio", audioUrl: downloadUrl, text: "🎤 Voice message" };
    } else if (mediaType === "document") {
      messagePayload = { type: "document", documentUrl: downloadUrl, text: `📎 ${fileName}` };
    } else {
      messagePayload = { type: mediaType, text: "" };
    }

    // Add file metadata
    messagePayload.fileName = fileName;
    messagePayload.fileSize = fileSize;
    messagePayload.mimeType = mimeType;

    console.log("uploadFileAndSend: Sending message", messagePayload);

    // Send the message via existing chat pipeline
    try {
      await sendMessage(messagePayload);
      console.log("uploadFileAndSend: Message sent successfully");
    } catch (error) {
      console.error("uploadFileAndSend: Failed to send message", error);
      alert("File uploaded but failed to send message: " + error.message);
    }
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
  const isCallsView = activeTab === "Calls";
  const isNotificationsView = activeTab === "Notifications";

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

      <div className={`app-content ${isFriendsView ? "friends-active" : ""} ${isCallsView ? "calls-active" : ""} ${isNotificationsView ? "notifications-active" : ""}`}>
        {isFriendsView ? (
          <div className="friends-layout">
            <FriendRequestsPage
              friendData={friendData}
              onOpenSearch={() => setShowSearchFriends(true)}
            />
            {showSearchFriends ? (
              <SearchFriendsModal
                user={user}
                friendData={{
                  ...friendData,
                  currentUsername: profile.username,
                }}
                onClose={() => setShowSearchFriends(false)}
                inline
              />
            ) : null}
          </div>
        ) : isCallsView ? (
          <CallsPage user={user} />
        ) : isNotificationsView ? (
          <div className="notifications-layout">
            <NotificationsPage onNavigate={(page, ...args) => {
              if (page === "chat") {
                setActiveTab("Chats");
                if (args[0]) {
                  const chat = filteredChats.find(c => c.chatId === args[0]);
                  if (chat) handleSelectChat(chat);
                }
              } else if (page === "friends") {
                setActiveTab("Friends");
              } else if (page === "calls") {
                setActiveTab("Calls");
              } else if (page === "settings") {
                openSettings();
              }
            }} />
          </div>
        ) : (
          <>
            <ChatList
              chats={filteredChats}
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
              onStartVoiceCall={() => startCall(false)}
              onStartVideoCall={() => startCall(true)}
              onSendFile={(files) => {
                console.log("onSendFile called with files:", files);
                if (!files || files.length === 0) {
                  console.warn("No files provided");
                  return;
                }
                 
                const item = files[0];
                console.log("Processing item:", item);
                 
                if (!item) {
                  console.warn("Item is undefined");
                  return;
                }
                 
                // Use the explicit category from AttachmentSheet/Composer
                const category = item.category || "image";
                const file = item.file;
                 
                console.log("Category:", category, "File exists:", !!file);
                 
                // Location sharing
                if (category === "location" && item.latitude && item.longitude) {
                  console.log("Sending location");
                  sendMessage({
                    text: `📍 ${item.name || "Location"}\nhttps://maps.google.com/maps?q=${item.latitude},${item.longitude}`,
                    type: "text",
                  });
                  return;
                }
                 
                // Contact sharing
                if (category === "contact" && item.contactData) {
                  console.log("Sending contact");
                  sendMessage({
                    text: `👤 ${item.contactData.name}\n📞 ${item.contactData.phone}`,
                    type: "text",
                  });
                  return;
                }
                 
                // File upload
                if (!file) {
                  console.error("No file object provided for category:", category);
                  alert("Error: No file selected. Please try again.");
                  return;
                }
                 
                console.log("Uploading file:", file.name, "as", category);
                uploadFileAndSend(file, category);
              }}
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
          onClose={() => setShowSettings(false)}
        />
      ) : null}

      {showSearchFriends && !isFriendsView ? (
        <SearchFriendsModal
          user={user}
          friendData={{
            ...friendData,
            currentUsername: profile.username,
          }}
          onClose={() => setShowSearchFriends(false)}
        />
      ) : null}

      {incomingCall ? (
        <IncomingCallModal
          call={incomingCall}
          callerName={incomingCall.callerDisplayName}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      ) : null}

      {activeCall ? (
        <CallWindow
          callId={activeCall.callId}
          remoteName={activeCall.remoteName}
          videoEnabled={activeCall.videoEnabled}
          onCallEnd={handleCallEnd}
        />
      ) : null}

      {showUniqueIdSetup ? (
        <UniqueIdSetup
          user={user}
          onComplete={() => {
            setShowUniqueIdSetup(false);
            if (user) {
              getDoc(doc(db, "users", user.uid)).then((snap) => {
                if (snap.exists()) {
                  setProfile((prev) => ({ ...prev, uniqueId: snap.data().uniqueId || "" }));
                }
              });
            }
          }}
        />
      ) : null}

      {showUsernameSetup ? (
        <UsernameSetup
          user={user}
          onComplete={() => {
            setShowUsernameSetup(false);
            // Reload profile to get the new username
            if (user) {
              getDoc(doc(db, "users", user.uid)).then((snap) => {
                if (snap.exists()) {
                  setProfile((prev) => ({ ...prev, username: snap.data().username || "" }));
                }
              });
            }
          }}
        />
      ) : null}

      {showEditUsername ? (
        <EditUsernameModal
          user={user}
          currentUsername={profile.username}
          onClose={() => setShowEditUsername(false)}
          onUpdate={(newUsername) => {
            setProfile((prev) => ({ ...prev, username: newUsername }));
          }}
        />
      ) : null}

      <input ref={fileInputRef} type="file" accept="image/*,audio/*" hidden onChange={handleImageUpload} />
    </div>
  );
}
  
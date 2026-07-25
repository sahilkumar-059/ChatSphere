import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeToChatUnreadCounts } from "../services/notificationService";
import MuteModal from "./MuteModal";

export default function ChatList({
  chats,
  searchChats,
  onSearchChats,
  selectedChatId,
  onSelectChat,
}) {
  const { user } = useAuth();
  const [chatUnread, setChatUnread] = useState({});
  const [muteModalChat, setMuteModalChat] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToChatUnreadCounts(user.uid, (unreadMap) => {
      setChatUnread(unreadMap || {});
    });
    return unsubscribe;
  }, [user?.uid]);

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setMuteModalChat(chat);
  };

  const displayChats = Array.isArray(chats) ? chats : [];

  return (
    <section className="chat-list-shell">
      <div className="chat-list-header">
        <div>
          <p className="eyebrow">Conversations</p>
          <h2>Chat List</h2>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search chats"
          value={searchChats}
          onChange={(event) => onSearchChats(event.target.value)}
        />
      </div>

      <div className="chat-list-items">
        {displayChats.length === 0 ? (
          <div className="chat-list-empty">
            <div className="empty-icon">💬</div>
            <h3>No conversations yet</h3>
            <p>Search for friends to start chatting</p>
          </div>
        ) : (
          displayChats.map((chat) => {
            const chatId = chat.chatId || chat.id || chat.friendId;
            const friendId = chat.friendId || chat.id;
            const chatName = chat.name || chat.friendFullName;
            const chatAvatar = chat.avatar || chat.friendPhotoURL || chat.friendFullName?.charAt(0) || "?";
            const chatOnline = chat.online !== undefined ? chat.online : false;
            const lastMessage = chat.lastMessagePreview || chat.lastMessage || "No messages yet";
            const lastTime = chat.lastTime || "";
            const unread = chatUnread[chatId] || chat.unread || 0;

            return (
              <button
                key={chatId}
                className={`chat-row ${selectedChatId === chatId ? "active" : ""}`}
                onClick={() =>
                  onSelectChat({
                    ...chat,
                    id: friendId,
                    friendId,
                    chatId,
                    name: chatName,
                    avatar: chatAvatar,
                    online: chatOnline,
                  })
                }
                onContextMenu={(e) => handleContextMenu(e, { chatId, chatName, friendId })}
              >
                <div className="chat-avatar">
                  {typeof chatAvatar === "string" && chatAvatar.startsWith("http") ? (
                    <img src={chatAvatar} alt={chatName} className="chat-avatar-img" />
                  ) : (
                    <span>{chatAvatar}</span>
                  )}
                  <span className={`presence-dot ${chatOnline ? "online" : "offline"}`} />
                  {/* Green unread dot - WhatsApp style */}
                  {unread > 0 && <span className="unread-dot" />}
                </div>

                <div className="chat-row-body">
                  <div className="chat-row-top">
                    <strong>{chatName}</strong>
                    <span>{lastTime}</span>
                  </div>

                  <div className="chat-row-bottom">
                    <p>{lastMessage}</p>
                    {unread > 0 && (
                      <span className="unread-pill">{unread > 99 ? "99+" : unread}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {muteModalChat && (
        <MuteModal
          chatId={muteModalChat.chatId}
          chatName={muteModalChat.chatName}
          onClose={() => setMuteModalChat(null)}
        />
      )}
    </section>
  );
}
import { useState, useMemo, useCallback } from "react";
import Composer from "./Composer";
import MessageBubble from "./MessageBubble";
import MediaViewer from "./MediaViewer";
import MessageContextMenu from "./MessageContextMenu";
import EditMessageModal from "./EditMessageModal";
import DeleteMessageModal from "./DeleteMessageModal";
import MessageInfoModal from "./MessageInfoModal";
import { editMessage, deleteMessageForMe, deleteMessageForEveryone } from "../services/chatService";

export default function ChatWindow({
  user,
  chat,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onTyping,
  isTyping,
  typingUser,
  onDropFiles,
  onDragOver,
  dragPreview,
  onRecordToggle,
  isRecording,
  messagesEndRef,
  onMarkSeen,
  currentUserPresence,
  onStartVoiceCall,
  onStartVideoCall,
  onSendFile,
}) {
  const [mediaViewer, setMediaViewer] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editMessageData, setEditMessageData] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Collect all image messages for navigation
  const imageMessages = useMemo(() => {
    return messages.filter((m) => m.type === "image" && m.imageUrl);
  }, [messages]);

  const handleImageClick = (message) => {
    const index = imageMessages.findIndex((m) => m.id === message.id);
    setMediaViewer({ images: imageMessages, initialIndex: Math.max(0, index) });
  };

  // Context menu handler
  const handleContextMenu = useCallback((e, message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX || 0,
      y: e.clientY || 0,
      message,
      isOwn: message.senderId === user?.uid,
    });
  }, [user?.uid]);

  // Copy text
  const handleCopy = useCallback((msg) => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text).catch(() => {});
    }
  }, []);

  // Edit message
  const handleEdit = useCallback((msg) => {
    setEditMessageData(msg);
  }, []);

  const handleEditSave = useCallback(async (messageId, newText) => {
    await editMessage(messageId, newText);
  }, []);

  // Delete for Me
  const handleDeleteForMe = useCallback((msg) => {
    setDeleteModal({ message: msg, mode: "me" });
  }, []);

  const confirmDeleteForMe = useCallback(async () => {
    if (!deleteModal?.message?.id || !user?.uid) return;
    await deleteMessageForMe(deleteModal.message.id, user.uid);
    setDeleteModal(null);
  }, [deleteModal, user?.uid]);

  // Delete for Everyone
  const handleDeleteForEveryone = useCallback((msg) => {
    setDeleteModal({ message: msg, mode: "everyone" });
  }, []);

  const confirmDeleteForEveryone = useCallback(async () => {
    if (!deleteModal?.message?.id) return;
    await deleteMessageForEveryone(deleteModal.message.id);
    setDeleteModal(null);
  }, [deleteModal]);

  // Message Info
  const handleMessageInfo = useCallback((msg) => {
    setInfoMessage(msg);
  }, []);

  // Download media
  const handleDownload = useCallback(async (msg) => {
    const url = msg.imageUrl || msg.audioUrl || msg.documentUrl;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = msg.fileName || `download.${blob.type.split("/")[1] || "bin"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, []);

  // Open media
  const handleOpen = useCallback((msg) => {
    const url = msg.imageUrl || msg.audioUrl || msg.documentUrl;
    if (url) window.open(url, "_blank");
  }, []);
  if (!chat) {
    return (
      <section className="chat-window-shell">
        <div className="chat-window-empty">
          <div className="empty-icon">💭</div>
          <h3>Select a conversation</h3>
          <p>Choose a friend from the chat list to start messaging</p>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-window-shell">
      <header className="chat-window-header">
        <div className="chat-window-title">
          <div className="chat-window-avatar">
            {typeof chat.avatar === "string" && chat.avatar.startsWith("http") ? (
              <img src={chat.avatar} alt={chat.name} className="chat-avatar-img" />
            ) : (
              chat.avatar
            )}
          </div>
          <div>
            <h2>{chat.name}</h2>
            <p className="presence-text">{currentUserPresence}</p>
          </div>
        </div>

        <div className="chat-window-tools">
          <button
            className="icon-button"
            type="button"
            aria-label="Voice call"
            onClick={onStartVoiceCall}
          >
            📞
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Video call"
            onClick={onStartVideoCall}
          >
            🎥
          </button>
          <button className="icon-button" type="button" aria-label="More options">
            ⋮
          </button>
        </div>
      </header>

      <div className="message-feed">
        {dragPreview ? <div className="drag-banner">{dragPreview}</div> : null}

        {messages.length === 0 ? (
          <div className="messages-empty">
            <div className="empty-icon">✨</div>
            <h3>No messages yet</h3>
            <p>Send a message to start the conversation</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user?.uid}
              onImageClick={handleImageClick}
              onContextMenu={handleContextMenu}
            />
          ))
        )}

        {isTyping ? (
          <div className="typing-pill">
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
            {typingUser} is typing...
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      <Composer
        messageInput={messageInput}
        onMessageInputChange={onMessageInputChange}
        onSendMessage={onSendMessage}
        onTyping={onTyping}
        isRecording={isRecording}
        onDropFiles={onDropFiles}
        onDragOver={onDragOver}
        dragPreview={dragPreview}
        onSendFile={onSendFile}
      />

      <div className="hidden-actions">
        <button onClick={onMarkSeen}>Mark Seen</button>
      </div>

      {mediaViewer && (
        <MediaViewer
          images={mediaViewer.images}
          initialIndex={mediaViewer.initialIndex}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={contextMenu.message}
          isOwn={contextMenu.isOwn}
          onClose={() => setContextMenu(null)}
          onCopy={handleCopy}
          onEdit={handleEdit}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          onMessageInfo={handleMessageInfo}
          onDownload={handleDownload}
          onOpen={handleOpen}
        />
      )}

      {editMessageData && (
        <EditMessageModal
          message={editMessageData}
          onSave={handleEditSave}
          onClose={() => setEditMessageData(null)}
        />
      )}

      {deleteModal && (
        <DeleteMessageModal
          mode={deleteModal.mode}
          onConfirm={deleteModal.mode === "me" ? confirmDeleteForMe : confirmDeleteForEveryone}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {infoMessage && (
        <MessageInfoModal
          message={infoMessage}
          onClose={() => setInfoMessage(null)}
        />
      )}
    </section>
  );
}
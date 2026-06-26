import MessageBubble from "./MessageBubble";

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
  onImageUpload,
  onDropFiles,
  onDragOver,
  dragPreview,
  onRecordToggle,
  isRecording,
  messagesEndRef,
  onMarkSeen,
  currentUserPresence,
}) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSendMessage();
    }
  };

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
    <section
      className="chat-window-shell"
      onDragOver={onDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDropFiles(event.dataTransfer.files);
      }}
    >
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
          <button className="icon-button" type="button" aria-label="Voice call">
            📞
          </button>
          <button className="icon-button" type="button" aria-label="Video call">
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

      <footer className="composer-shell">
        <div className="composer-actions">
          <button className="icon-button" type="button" onClick={onImageUpload} aria-label="Attach file">
            📎
          </button>
          <button
            className={`icon-button ${isRecording ? "recording" : ""}`}
            type="button"
            onClick={onRecordToggle}
            aria-label="Record voice message"
          >
            🎤
          </button>
        </div>

        <textarea
          className="composer-input"
          placeholder="Type a message..."
          value={messageInput}
          onChange={(event) => {
            onMessageInputChange(event.target.value);
            onTyping();
          }}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button className="primary-button compact send-button" onClick={onSendMessage} aria-label="Send message">
          ➤
        </button>
      </footer>

      <div className="hidden-actions">
        <button onClick={onMarkSeen}>Mark Seen</button>
      </div>
    </section>
  );
}
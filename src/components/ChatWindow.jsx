import EmojiPicker from "emoji-picker-react";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({
  user,
  chat,
  messages,
  messageInput,
  onMessageInputChange,
  onSendMessage,
  onEmojiToggle,
  showEmojiPicker,
  onEmojiSelect,
  onTyping,
  isTyping,
  typingUser,
  onImageUpload,
  onDropFiles,
  onDragOver,
  dragPreview,
  onRecordToggle,
  isRecording,
  onSearchMessages,
  searchMessages,
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
          <div className="chat-window-avatar">{chat.avatar}</div>
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
          <input
            className="search-input compact"
            type="text"
            placeholder="Search messages"
            value={searchMessages}
            onChange={(event) => onSearchMessages(event.target.value)}
          />
          <button className="icon-button" onClick={onEmojiToggle} aria-label="Emoji picker">
            😊
          </button>
          <button className="icon-button" onClick={onImageUpload} aria-label="Attach image">
            📎
          </button>
          <button
            className={`icon-button ${isRecording ? "recording" : ""}`}
            onClick={onRecordToggle}
            aria-label="Record voice message"
          >
            🎙️
          </button>
        </div>
      </header>

      <div className="message-feed">
        {dragPreview ? <div className="drag-banner">{dragPreview}</div> : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === user?.uid}
          />
        ))}

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
        <button className="icon-button" onClick={onEmojiToggle} aria-label="Open emoji picker">
          😄
        </button>

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

        <button className="primary-button compact" onClick={onSendMessage}>
          Send
        </button>
      </footer>

      {showEmojiPicker ? (
        <div className="emoji-popover">
          <EmojiPicker onEmojiClick={onEmojiSelect} theme="dark" />
        </div>
      ) : null}

      <div className="hidden-actions">
        <button onClick={onMarkSeen}>Mark Seen</button>
      </div>
    </section>
  );
}
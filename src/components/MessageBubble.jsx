import { useEffect, useRef } from "react";

export default function MessageBubble({ message, isOwn, onImageClick, onContextMenu }) {
  const timerRef = useRef(null);

  const handleContext = (e) => {
    e.preventDefault();
    onContextMenu?.(e, message);
  };

  const handleTouchStart = () => {
    timerRef.current = setTimeout(() => {
      onContextMenu?.({ clientX: 0, clientY: 0, preventDefault: () => {} }, message);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const statusLabel =
    message.status === "seen"
      ? "✓✓ Seen"
      : message.status === "delivered"
        ? "✓✓ Delivered"
        : "✓ Sent";

  // Show deleted message placeholder
  if (message.deletedForEveryone) {
    return (
      <div className={`message-bubble deleted ${isOwn ? "sent" : "received"}`}>
        <p className="deleted-msg-text">This message was deleted</p>
        <div className="message-meta">
          <span>{message.timeLabel}</span>
        </div>
      </div>
    );
  }

  // Hide if deleted for this user
  if (message.deletedFor && message.deletedFor === "__current__") {
    return null; // The parent will pass the correct deletedFor check
  }

  return (
    <div
      className={`message-bubble ${isOwn ? "sent" : "received"}`}
      onContextMenu={handleContext}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
    >
      {message.type === "image" ? (
        <div onClick={() => onImageClick?.(message)} style={{ cursor: "pointer" }}>
          <img
            className="message-image"
            src={message.imageUrl}
            alt={message.text || "Shared image"}
          />
          {message.text ? <p>{message.text}</p> : null}
        </div>
      ) : null}

      {message.type === "audio" ? (
        <div className="audio-message">
          <audio controls src={message.audioUrl} />
          {message.text ? <p>{message.text}</p> : null}
        </div>
      ) : null}

      {(message.type === "text" || !message.type) && (
        <p>
          {message.text}
          {message.edited && <span className="edited-label"> (edited)</span>}
        </p>
      )}

      {message.type === "video" && message.imageUrl ? (
        <div onClick={() => onImageClick?.(message)} style={{ cursor: "pointer" }}>
          <img className="message-image" src={message.imageUrl} alt="Video" />
          <p>📹 {message.text || "Video"}</p>
        </div>
      ) : null}

      {message.type === "document" && (
        <div className="document-message">
          <p>📎 {message.fileName || "Document"}</p>
          {message.text && <p>{message.text}</p>}
        </div>
      )}

      <div className="message-meta">
        <span>{message.timeLabel}</span>
        {isOwn ? <span className={`message-status ${message.status || "sent"}`}>{statusLabel}</span> : null}
      </div>
    </div>
  );
}
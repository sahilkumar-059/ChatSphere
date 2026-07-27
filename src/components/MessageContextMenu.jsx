import { useEffect, useRef } from "react";

export default function MessageContextMenu({
  x,
  y,
  message,
  isOwn,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onMessageInfo,
  onDownload,
  onOpen,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  const isText = message.type === "text" || !message.type;
  const isMedia = message.type === "image" || message.type === "video" || message.type === "audio" || message.type === "document";

  return (
    <div
      ref={menuRef}
      className="msg-context-menu"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {/* Reply - always available */}
      <button className="msg-context-item" onClick={() => { onReply?.(message); onClose(); }}>
        <span className="msg-context-icon">↩</span>
        <span>Reply</span>
      </button>

      {/* Copy - only for text messages */}
      {isText && (
        <button className="msg-context-item" onClick={() => { onCopy?.(message); onClose(); }}>
          <span className="msg-context-icon">📋</span>
          <span>Copy</span>
        </button>
      )}

      {/* Open - for media messages */}
      {isMedia && (
        <button className="msg-context-item" onClick={() => { onOpen?.(message); onClose(); }}>
          <span className="msg-context-icon">↗</span>
          <span>Open</span>
        </button>
      )}

      {/* Download - for media messages */}
      {isMedia && (
        <button className="msg-context-item" onClick={() => { onDownload?.(message); onClose(); }}>
          <span className="msg-context-icon">⬇</span>
          <span>Download</span>
        </button>
      )}

      {/* Edit - only for own text messages */}
      {isOwn && isText && (
        <button className="msg-context-item" onClick={() => { onEdit?.(message); onClose(); }}>
          <span className="msg-context-icon">✏️</span>
          <span>Edit</span>
        </button>
      )}

      <div className="msg-context-divider" />

      {/* Delete for Me - always available */}
      <button className="msg-context-item danger" onClick={() => { onDeleteForMe?.(message); onClose(); }}>
        <span className="msg-context-icon">🗑</span>
        <span>Delete for Me</span>
      </button>

      {/* Delete for Everyone - only own messages */}
      {isOwn && (
        <button className="msg-context-item danger" onClick={() => { onDeleteForEveryone?.(message); onClose(); }}>
          <span className="msg-context-icon">🚫</span>
          <span>Delete for Everyone</span>
        </button>
      )}

      <div className="msg-context-divider" />

      {/* Message Info */}
      <button className="msg-context-item" onClick={() => { onMessageInfo?.(message); onClose(); }}>
        <span className="msg-context-icon">ℹ</span>
        <span>Message Info</span>
      </button>
    </div>
  );
}
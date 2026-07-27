import { useState, useEffect } from "react";
import { getMessageInfo } from "../services/chatService";

function formatDate(date) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function formatTime(date) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getMessageTypeLabel(type) {
  const map = {
    text: "Text",
    image: "Image",
    audio: "Voice Message",
    video: "Video",
    document: "Document",
  };
  return map[type] || type || "Text";
}

export default function MessageInfoModal({ message, onClose }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!message?.id) return;
    setLoading(true);
    getMessageInfo(message.id).then((data) => {
      setInfo(data);
      setLoading(false);
    });
  }, [message?.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="msg-info-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="msg-info-header">
          <h3>Message Info</h3>
          <button className="msg-info-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="msg-info-loading">Loading...</div>
        ) : info ? (
          <div className="msg-info-body">
            <div className="msg-info-row">
              <span className="msg-info-label">Sender</span>
              <span className="msg-info-value">{info.senderName || "Unknown"}</span>
            </div>
            <div className="msg-info-row">
              <span className="msg-info-label">Type</span>
              <span className="msg-info-value">{getMessageTypeLabel(info.type)}</span>
            </div>
            <div className="msg-info-row">
              <span className="msg-info-label">Date</span>
              <span className="msg-info-value">{formatDate(info.createdAt)}</span>
            </div>
            <div className="msg-info-row">
              <span className="msg-info-label">Time</span>
              <span className="msg-info-value">{formatTime(info.createdAt)}</span>
            </div>
            {info.edited && (
              <div className="msg-info-row">
                <span className="msg-info-label">Edited</span>
                <span className="msg-info-value">{formatTime(info.editedAt)}</span>
              </div>
            )}
            <div className="msg-info-row">
              <span className="msg-info-label">Status</span>
              <span className="msg-info-value">
                {info.status === "seen" ? "✓✓ Seen" : info.status === "delivered" ? "✓✓ Delivered" : "✓ Sent"}
              </span>
            </div>
            {info.seenAt && (
              <div className="msg-info-row">
                <span className="msg-info-label">Seen at</span>
                <span className="msg-info-value">{formatTime(info.seenAt)}</span>
              </div>
            )}
            {info.fileName && (
              <div className="msg-info-row">
                <span className="msg-info-label">File</span>
                <span className="msg-info-value">{info.fileName}</span>
              </div>
            )}
            {info.fileSize > 0 && (
              <div className="msg-info-row">
                <span className="msg-info-label">Size</span>
                <span className="msg-info-value">
                  {info.fileSize > 1024 * 1024
                    ? `${(info.fileSize / (1024 * 1024)).toFixed(1)} MB`
                    : `${(info.fileSize / 1024).toFixed(1)} KB`}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="msg-info-error">Could not load message info</div>
        )}
      </div>
    </div>
  );
}
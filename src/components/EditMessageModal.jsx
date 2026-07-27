import { useState, useEffect, useRef } from "react";

export default function EditMessageModal({ message, onSave, onClose }) {
  const [text, setText] = useState(message?.text || "");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await onSave(message.id, text.trim());
      onClose();
    } catch (err) {
      console.error("Edit failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-msg-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="edit-msg-header">
          <h3>Edit Message</h3>
          <button className="edit-msg-close" onClick={onClose}>✕</button>
        </div>
        <div className="edit-msg-body">
          <textarea
            ref={inputRef}
            className="edit-msg-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={3}
          />
          <p className="edit-msg-hint">Press Enter to save · Esc to cancel</p>
        </div>
        <div className="edit-msg-footer">
          <button className="wallpaper-btn secondary" onClick={onClose}>Cancel</button>
          <button
            className="wallpaper-btn primary"
            onClick={handleSave}
            disabled={!text.trim() || saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
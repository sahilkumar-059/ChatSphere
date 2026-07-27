export default function DeleteMessageModal({ mode, onConfirm, onCancel }) {
  const isEveryone = mode === "everyone";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="delete-msg-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-msg-icon">{isEveryone ? "🚫" : "🗑"}</div>
        <h3 className="delete-msg-title">
          {isEveryone ? "Delete for Everyone?" : "Delete for Me?"}
        </h3>
        <p className="delete-msg-desc">
          {isEveryone
            ? "This message will be removed for both you and the other person. They will see that you deleted the message."
            : "This message will only be removed from your chat. The other person will still be able to see it."}
        </p>
        <div className="delete-msg-actions">
          <button className="wallpaper-btn secondary" onClick={onCancel}>Cancel</button>
          <button
            className={`wallpaper-btn ${isEveryone ? "danger-btn" : "danger-btn"}`}
            onClick={onConfirm}
            style={{
              background: isEveryone
                ? "linear-gradient(135deg, #dc2626, #ef4444)"
                : "linear-gradient(135deg, #f59e0b, #f97316)",
              color: "white",
              boxShadow: isEveryone
                ? "0 4px 15px rgba(239, 68, 68, 0.4)"
                : "0 4px 15px rgba(249, 115, 22, 0.4)",
            }}
          >
            {isEveryone ? "Delete for Everyone" : "Delete for Me"}
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  muteChat,
  unmuteChat,
  getChatMuteStatus,
  MUTE_DURATION_OPTIONS,
  formatMuteExpiry,
} from "../services/notificationService";

export default function MuteModal({ chatId, chatName, onClose }) {
  const { user } = useAuth();
  const [currentMute, setCurrentMute] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !chatId) return;
    let cancelled = false;
    getChatMuteStatus(user.uid, chatId).then((status) => {
      if (!cancelled) {
        setCurrentMute(status);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [user?.uid, chatId]);

  const handleMute = async (duration) => {
    if (!user?.uid || !chatId) return;
    await muteChat(user.uid, chatId, duration);
    setCurrentMute({ isMuted: true, mutedDuration: duration });
    onClose();
  };

  const handleUnmute = async () => {
    if (!user?.uid || !chatId) return;
    await unmuteChat(user.uid, chatId);
    setCurrentMute({ isMuted: false });
    onClose();
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="mute-modal glass-card" onClick={(e) => e.stopPropagation()}>
          <div className="mute-modal-loading">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mute-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="mute-modal-header">
          <button className="mute-modal-close" onClick={onClose}>✕</button>
          <h3>Notifications for {chatName}</h3>
        </div>

        {currentMute?.isMuted ? (
          <div className="mute-modal-body">
            <div className="mute-current-status">
              <span className="mute-status-icon">🔇</span>
              <div>
                <strong>Muted</strong>
                <p>{formatMuteExpiry(currentMute.mutedUntil)}</p>
              </div>
            </div>
            <button className="mute-action-btn unmute-btn" onClick={handleUnmute}>
              🔔 Unmute Notifications
            </button>
          </div>
        ) : (
          <div className="mute-modal-body">
            <p className="mute-description">Mute notifications for</p>
            <div className="mute-duration-list">
              {MUTE_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className="mute-duration-btn"
                  onClick={() => handleMute(option.id)}
                >
                  <span className="mute-duration-icon">{option.icon}</span>
                  <span className="mute-duration-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
  formatRelativeTime,
} from "../services/notificationService";
import "../styles/Notifications.css";

const NOTIF_EMOJI = {
  message: "💬",
  friend: "👥",
  call: "📞",
  system: "⚙️",
};

const TABS = [
  { id: "all", label: "All" },
  { id: "message", label: "Messages" },
  { id: "friend", label: "Friends" },
  { id: "call", label: "Calls" },
  { id: "system", label: "System" },
];

export default function NotificationsPage({ onNavigate }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs);
    });
    return unsubscribe;
  }, [user?.uid]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => n.type === activeTab);
  }, [notifications, activeTab]);

  const handleMarkAllRead = async () => {
    if (!user?.uid || unreadCount === 0) return;
    await markAllAsRead(user.uid);
  };

  const handleClearAll = async () => {
    if (!user?.uid || notifications.length === 0) return;
    await clearAllNotifications(user.uid);
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead && notif.id) {
      await markAsRead(notif.id);
    }

    if (onNavigate) {
      switch (notif.type) {
        case "message":
          if (notif.referenceId) {
            onNavigate("chat", notif.referenceId, notif.senderId);
          }
          break;
        case "friend":
          onNavigate("friends");
          break;
        case "call":
          onNavigate("calls");
          break;
        case "system":
          onNavigate("settings");
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-panel">
        {/* Header */}
        <div className="notifications-header">
          <div className="notifications-header-top">
            <h1 className="notifications-title">
              <span className="notifications-title-icon">🔔</span>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="notifications-unread-badge">{unreadCount}</span>
            )}
          </div>
          <div className="notifications-actions">
            <button
              className="notifications-action-btn"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              <span className="action-icon">✓</span>
              Mark All as Read
            </button>
            <button
              className="notifications-action-btn danger"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
            >
              <span className="action-icon">✕</span>
              Clear All
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="notifications-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`notifications-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id !== "all" && <span className="tab-emoji">{NOTIF_EMOJI[tab.id]}</span>}
              {tab.label}
              {tab.id !== "all" && (
                <span className="notifications-tab-count">
                  {notifications.filter((n) => n.type === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="notifications-list">
          {filteredNotifications.length === 0 ? (
            <div className="notifications-empty">
              <div className="notifications-empty-icon">🔔</div>
              <h3 className="empty-title">No notifications</h3>
              <p className="empty-subtitle">
                You're all caught up!
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const emoji = NOTIF_EMOJI[notif.type] || "🔔";
              const timeLabel = formatRelativeTime(notif.createdAt);
              const displayName = notif.senderName || (notif.type === "system" ? "System" : "Someone");

              return (
                <div
                  key={notif.id}
                  className={`notif-card ${notif.isRead ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  {/* Avatar */}
                  <div className="notif-avatar-wrapper">
                    {notif.senderPhoto ? (
                      <img
                        src={notif.senderPhoto}
                        alt=""
                        className="notif-avatar"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="notif-avatar-fallback"
                      style={{ display: notif.senderPhoto ? "none" : "flex" }}
                    >
                      {emoji}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="notif-content">
                    <div className="notif-content-top">
                      <span className="notif-username">{displayName}</span>
                      <span className="notif-time">{timeLabel}</span>
                    </div>
                    <div className="notif-title">{notif.title}</div>
                    {notif.message && <div className="notif-message">{notif.message}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
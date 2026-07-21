import { useState, useRef, useEffect } from "react";
import ProfileEditor from "./ProfileEditor";
import WallpaperEditor from "./WallpaperEditor";
import { checkUniqueIdAvailability, updateUniqueId } from "../services/authService";

const settingsCards = [
  { id: "profile", icon: "👤", title: "Profile", description: "Manage your personal information, username, bio, profile picture and status." },
  { id: "uniqueid", icon: "🆔", title: "Unique ID", description: "Your unique identifier on ChatSphere." },
  { id: "appearance", icon: "🎨", title: "Appearance", description: "Theme, wallpapers and chat colors." },
  { id: "notifications", icon: "🔔", title: "Notifications", description: "Notification preferences." },
  { id: "privacy", icon: "🔒", title: "Privacy", description: "Blocked users, read receipts, last seen, online status." },
  { id: "chats", icon: "💬", title: "Chats", description: "Wallpaper, font size, media auto download." },
  { id: "calls", icon: "📞", title: "Calls", description: "Call settings and history preferences." },
  { id: "language", icon: "🌐", title: "Language", description: "Choose app language." },
  { id: "about", icon: "ℹ️", title: "About", description: "Version, developer information." },
];

export default function Settings({
  user,
  profile,
  settings,
  onProfileChange,
  onToggleTheme,
  onToggleNotifications,
  onToggleReadReceipts,
  onWallpaperChange,
  onSaveProfile,
  onLogout,
  onClose,
}) {
  const [activeSection, setActiveSection] = useState(null);
  const [editUniqueId, setEditUniqueId] = useState(false);
  const [newUniqueId, setNewUniqueId] = useState("");
  const [uniqueIdAvailability, setUniqueIdAvailability] = useState(null);
  const [checkingUniqueId, setCheckingUniqueId] = useState(false);
  const [savingUniqueId, setSavingUniqueId] = useState(false);
  const [uniqueIdError, setUniqueIdError] = useState("");
  const [toast, setToast] = useState(null);
  const uniqueIdInputRef = useRef(null);
  const uniqueIdCheckTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (uniqueIdCheckTimerRef.current) {
        clearTimeout(uniqueIdCheckTimerRef.current);
      }
    };
  }, []);

  const handleSaveProfile = async (profileData) => {
    await onSaveProfile(profileData);
    setActiveSection(null);
  };

  if (activeSection === "profile") {
    return (
      <div className="settings-page">
        <div className="settings-panel settings-profile-panel">
          <ProfileEditor
            user={user}
            profile={profile}
            onProfileChange={onProfileChange}
            onSave={handleSaveProfile}
            onClose={() => setActiveSection(null)}
          />
        </div>
      </div>
    );
  }

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyUniqueId = () => {
    if (profile.uniqueId) {
      navigator.clipboard.writeText(profile.uniqueId).then(() => {
        showToast("Unique ID copied!");
      }).catch(() => {
        showToast("Failed to copy", "error");
      });
    }
  };

  const handleEditUniqueId = () => {
    setEditUniqueId(true);
    setNewUniqueId(profile.uniqueId || "");
    setUniqueIdAvailability(null);
    setUniqueIdError("");
    setTimeout(() => uniqueIdInputRef.current?.focus(), 100);
  };

  const validateUniqueId = (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    return /^[a-z0-9_]{4,20}$/.test(trimmed);
  };

  const handleUniqueIdChange = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9_]/g, "");
    setNewUniqueId(cleaned);
    setUniqueIdAvailability(null);
    setUniqueIdError("");

    // Clear previous timer
    if (uniqueIdCheckTimerRef.current) {
      clearTimeout(uniqueIdCheckTimerRef.current);
    }

    const trimmed = cleaned.trim().toLowerCase();
    if (!validateUniqueId(trimmed)) {
      if (trimmed.length > 0) {
        setUniqueIdError("Must be 4-20 characters (letters, numbers, underscores)");
      }
      return;
    }
    if (trimmed === (profile.uniqueId || "").toLowerCase()) {
      setUniqueIdAvailability("same");
      return;
    }

    // Debounce: wait 400ms after user stops typing
    uniqueIdCheckTimerRef.current = setTimeout(async () => {
      setCheckingUniqueId(true);
      try {
        const available = await checkUniqueIdAvailability(trimmed);
        console.log(`[Settings UniqueID] Check "${trimmed}": ${available ? "available" : "taken"}`);
        setUniqueIdAvailability(available ? "available" : "taken");
      } catch (err) {
        console.error("[Settings UniqueID] Check error:", err.code, err.message);
        setUniqueIdError("Failed to check availability. Please try again.");
      } finally {
        setCheckingUniqueId(false);
      }
    }, 400);
  };

  const handleSaveUniqueId = async () => {
    const trimmed = newUniqueId.trim().toLowerCase();
    if (!validateUniqueId(trimmed)) {
      setUniqueIdError("Invalid Unique ID");
      return;
    }
    if (uniqueIdAvailability !== "available") {
      setUniqueIdError("This ID is already taken");
      return;
    }
    setSavingUniqueId(true);
    try {
      await updateUniqueId(user.uid, trimmed);
      onProfileChange({ ...profile, uniqueId: trimmed });
      showToast("Unique ID updated successfully!");
      setEditUniqueId(false);
    } catch (err) {
      setUniqueIdError(err.message || "Failed to update");
    } finally {
      setSavingUniqueId(false);
    }
  };

  // Unique ID panel
  if (activeSection === "uniqueid") {
    return (
      <div className="settings-page">
        <div className="settings-panel settings-profile-panel">
          <div className="profile-editor">
            <div className="profile-editor-header">
              <button className="profile-editor-back" onClick={() => setActiveSection(null)}>←</button>
              <h2>Unique ID</h2>
            </div>

            {toast && (
              <div className={`profile-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
                <span>{toast.type === "error" ? "✕" : "✓"}</span>
                <span>{toast.message}</span>
              </div>
            )}

            <div className="settings-uniqueid-section">
              {!editUniqueId ? (
                <>
                  <p className="settings-uniqueid-label">Your Unique ID</p>
                  <div className="settings-uniqueid-display">
                    <span className="settings-uniqueid-value">@{profile.uniqueId || "not set"}</span>
                    <button className="settings-uniqueid-copy" onClick={handleCopyUniqueId} title="Copy">
                      📋
                    </button>
                    <button className="settings-uniqueid-edit" onClick={handleEditUniqueId} title="Edit">
                      ✏️
                    </button>
                  </div>
                  <p className="settings-uniqueid-hint">
                    This is how other users can find and add you. Share your @UniqueID to connect.
                  </p>
                </>
              ) : (
                <>
                  <div className="username-input-group">
                    <div className="username-input-wrapper" style={{ marginTop: "16px" }}>
                      <span className="username-prefix">@</span>
                      <input
                        ref={uniqueIdInputRef}
                        type="text"
                        value={newUniqueId}
                        onChange={(e) => handleUniqueIdChange(e.target.value)}
                        placeholder="unique_id"
                        className="username-input"
                        disabled={savingUniqueId}
                      />
                    </div>
                    {checkingUniqueId && <span className="username-status checking">Checking...</span>}
                    {uniqueIdAvailability === "available" && <span className="username-status available">✓ Unique ID Available</span>}
                    {uniqueIdAvailability === "taken" && <span className="username-status taken">✗ This ID is already taken</span>}
                    {uniqueIdAvailability === "same" && <span className="username-status available">✓ This is your current ID</span>}
                  </div>
                  {uniqueIdError && <div className="username-error">{uniqueIdError}</div>}
                  <div className="username-rules" style={{ margin: "12px 0" }}>
                    <p>Unique ID requirements:</p>
                    <ul>
                      <li>4-20 characters</li>
                      <li>Letters, numbers, and underscores only</li>
                      <li>Must be globally unique</li>
                    </ul>
                  </div>
                  <div className="settings-uniqueid-actions">
                    <button
                      className="wallpaper-btn secondary"
                      onClick={() => setEditUniqueId(false)}
                      disabled={savingUniqueId}
                    >
                      Cancel
                    </button>
                    <button
                      className="wallpaper-btn primary"
                      onClick={handleSaveUniqueId}
                      disabled={savingUniqueId || uniqueIdAvailability !== "available" || !validateUniqueId(newUniqueId.trim().toLowerCase())}
                    >
                      {savingUniqueId ? "Saving..." : "Save"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSection === "wallpaper") {
    return (
      <div className="settings-page">
        <div className="settings-panel settings-wallpaper-panel">
          <WallpaperEditor
            settings={settings}
            onWallpaperChange={onWallpaperChange}
            onWallpaperEffectsChange={() => {}}
            onClose={() => setActiveSection(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-panel">
        <div className="settings-header-bar">
          <button className="settings-back-btn" onClick={onClose}>←</button>
          <h2 className="settings-title">Settings</h2>
        </div>

        <div className="settings-card-list">
          {settingsCards.map((card) => (
            <button
              key={card.id}
              className={`settings-card ${card.id === "profile" || card.id === "chats" || card.id === "uniqueid" ? "clickable" : ""}`}
              onClick={() => {
                if (card.id === "profile") setActiveSection("profile");
                if (card.id === "chats") setActiveSection("wallpaper");
                if (card.id === "uniqueid") setActiveSection("uniqueid");
              }}
              disabled={card.id !== "profile" && card.id !== "chats" && card.id !== "uniqueid"}
            >
              <span className="settings-card-icon">{card.icon}</span>
              <div className="settings-card-info">
                <strong className="settings-card-title">{card.title}</strong>
                <span className="settings-card-desc">{card.description}</span>
              </div>
              <span className="settings-card-arrow">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
import { useState, useRef, useEffect, useCallback } from "react";
import i18n, { LANGUAGE_LIST, persistLanguage } from "../i18n/i18n";
import ProfileEditor from "./ProfileEditor";
import { checkUniqueIdAvailability, updateUniqueId } from "../services/authService";
import { subscribeToNotificationSettings, updateNotificationSetting } from "../services/notificationService";

const settingsCards = [
  { id: "profile", icon: "👤", title: "Edit Profile", desc: "Name, photo, bio, location and personal info." },
  { id: "uniqueid", icon: "🆔", title: "Unique ID", desc: "Your unique identifier." },
  { id: "appearance", icon: "🎨", title: "Appearance", desc: "Theme, wallpaper, chat bubbles and more." },
  { id: "privacy", icon: "🔒", title: "Privacy", desc: "Online status, last seen, read receipts." },
  { id: "notifications", icon: "🔔", title: "Notifications", desc: "Message, call and friend request alerts." },
  { id: "language", icon: "🌐", title: "Language", desc: "Choose app language." },
  { id: "account", icon: "⚙️", title: "Account", desc: "Account settings, logout and data." },
  { id: "about", icon: "ℹ️", title: "About", desc: "Version, developer information." },
];

const CHAT_BUBBLE_STYLES = [
  { id: "rounded", label: "Rounded", preview: "bubble-rounded" },
  { id: "sharp", label: "Sharp", preview: "bubble-sharp" },
  { id: "modern", label: "Modern", preview: "bubble-modern" },
];

const FONT_SIZES = [
  { id: "small", label: "Small", value: "13px" },
  { id: "medium", label: "Medium", value: "15px" },
  { id: "large", label: "Large", value: "17px" },
];

const ACCENT_COLORS = [
  { id: "purple", label: "Purple", color: "#a78bfa" },
  { id: "blue", label: "Blue", color: "#60a5fa" },
  { id: "green", label: "Green", color: "#4ade80" },
  { id: "orange", label: "Orange", color: "#fb923c" },
  { id: "pink", label: "Pink", color: "#f472b6" },
  { id: "cyan", label: "Cyan", color: "#22d3ee" },
];

export default function Settings({
  user, profile, settings, onProfileChange, onToggleTheme, onToggleNotifications,
  onToggleReadReceipts, onWallpaperChange, onSaveProfile, onLogout, onClose,
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
  const [langSearch, setLangSearch] = useState("");
  const t = useCallback((key, opts) => i18n.t(key, opts), []);
  const [privacySettings, setPrivacySettings] = useState(settings.privacy || {});
  const [notifSettings, setNotifSettings] = useState(settings.notifications || {});
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: settings.themeMode || "dark",
    accentColor: settings.accentColor || "purple",
    chatBubbleStyle: settings.chatBubbleStyle || "rounded",
    fontSize: settings.fontSize || "medium",
    animations: settings.animations !== false,
  });

  useEffect(() => {
    return () => { if (uniqueIdCheckTimerRef.current) clearTimeout(uniqueIdCheckTimerRef.current); };
  }, []);

  const handleSaveProfile = async (pd) => { await onSaveProfile(pd); setActiveSection(null); };

  const showToastMsg = (msg, type = "success") => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyUniqueId = () => {
    if (profile.uniqueId) navigator.clipboard.writeText(profile.uniqueId).then(() => showToastMsg("Unique ID copied!")).catch(() => showToastMsg("Failed to copy", "error"));
  };

  const handleEditUniqueId = () => {
    setEditUniqueId(true);
    setNewUniqueId(profile.uniqueId || "");
    setUniqueIdAvailability(null);
    setUniqueIdError("");
    setTimeout(() => uniqueIdInputRef.current?.focus(), 100);
  };

  const validateUniqueId = (v) => { const t = v.trim().toLowerCase(); return !!t && /^[a-z0-9_]{4,20}$/.test(t); };

  const handleUniqueIdChange = (v) => {
    const c = v.replace(/[^a-zA-Z0-9_]/g, "");
    setNewUniqueId(c); setUniqueIdAvailability(null); setUniqueIdError("");
    if (uniqueIdCheckTimerRef.current) clearTimeout(uniqueIdCheckTimerRef.current);
    const t = c.trim().toLowerCase();
    if (!validateUniqueId(t)) { if (t.length > 0) setUniqueIdError("Must be 4-20 chars"); return; }
    if (t === (profile.uniqueId || "").toLowerCase()) { setUniqueIdAvailability("same"); return; }
    uniqueIdCheckTimerRef.current = setTimeout(async () => {
      setCheckingUniqueId(true);
      try { const a = await checkUniqueIdAvailability(t); setUniqueIdAvailability(a ? "available" : "taken"); }
      catch (err) { console.error(err); setUniqueIdError("Check failed"); }
      finally { setCheckingUniqueId(false); }
    }, 400);
  };

  const handleSaveUniqueId = async () => {
    const t = newUniqueId.trim().toLowerCase();
    if (!validateUniqueId(t)) { setUniqueIdError("Invalid"); return; }
    if (uniqueIdAvailability !== "available") { setUniqueIdError("Taken"); return; }
    setSavingUniqueId(true);
    try { await updateUniqueId(user.uid, t); onProfileChange({ ...profile, uniqueId: t }); showToastMsg("Updated!"); setEditUniqueId(false); }
    catch (err) { setUniqueIdError(err.message); } finally { setSavingUniqueId(false); }
  };

  const updateAppearance = (patch) => {
    const next = { ...appearanceSettings, ...patch };
    setAppearanceSettings(next);
    if (patch.theme) onToggleTheme();
    if (patch.accentColor) { document.documentElement.style.setProperty("--accent-color", ACCENT_COLORS.find(c => c.id === patch.accentColor)?.color || "#a78bfa"); }
    onProfileChange({ ...profile, ...patch });
  };

  const togglePrivacy = (k) => {
    const n = { ...privacySettings, [k]: !privacySettings[k] };
    setPrivacySettings(n);
    onProfileChange({ ...profile, privacy: n });
  };

  // Sync notification settings from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotificationSettings(user.uid, (settings) => {
      setNotifSettings(settings);
      // Also persist to parent
      onProfileChange({ ...profile, notifications: settings });
    });
    return unsub;
  }, [user?.uid]);

  const toggleNotifFirestore = async (key) => {
    if (!user?.uid) return;
    const newValue = !notifSettings[key];
    setNotifSettings((prev) => ({ ...prev, [key]: newValue }));
    await updateNotificationSetting(user.uid, key, newValue);
  };

  // Keep the existing toggleNotif for backward compat but add Firestore sync
  const toggleNotif = toggleNotifFirestore;

  // === PROFILE ===
  if (activeSection === "profile") {
    return (
      <div className="settings-page">
        <div className="settings-panel settings-profile-panel">
          <ProfileEditor user={user} profile={profile} onProfileChange={onProfileChange} onSave={handleSaveProfile} onClose={() => setActiveSection(null)} />
        </div>
      </div>
    );
  }

  // === UNIQUE ID ===
  if (activeSection === "uniqueid") {
    return (
      <div className="settings-page">
        <div className="settings-panel settings-profile-panel">
          <div className="profile-editor">
            <div className="profile-editor-header">
              <button className="profile-editor-back" onClick={() => setActiveSection(null)}>←</button>
              <h2>Unique ID</h2>
            </div>
            {toast && <div className={`profile-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}><span>{toast.type === "error" ? "✕" : "✓"}</span><span>{toast.message}</span></div>}
            <div className="settings-uniqueid-section">
              {!editUniqueId ? (
                <>
                  <p className="settings-uniqueid-label">Your Unique ID</p>
                  <div className="settings-uniqueid-display">
                    <span className="settings-uniqueid-value">@{profile.uniqueId || "not set"}</span>
                    <button className="settings-uniqueid-copy" onClick={handleCopyUniqueId} title="Copy">📋</button>
                    <button className="settings-uniqueid-edit" onClick={handleEditUniqueId} title="Edit">✏️</button>
                  </div>
                  <p className="settings-uniqueid-hint">This is how other users can find and add you.</p>
                </>
              ) : (
                <>
                  <div className="username-input-group">
                    <div className="username-input-wrapper" style={{ marginTop: "16px" }}>
                      <span className="username-prefix">@</span>
                      <input ref={uniqueIdInputRef} type="text" value={newUniqueId} onChange={e => handleUniqueIdChange(e.target.value)} placeholder="unique_id" className="username-input" disabled={savingUniqueId} />
                    </div>
                    {checkingUniqueId && <span className="username-status checking">Checking...</span>}
                    {uniqueIdAvailability === "available" && <span className="username-status available">✓ Available</span>}
                    {uniqueIdAvailability === "taken" && <span className="username-status taken">✗ Taken</span>}
                    {uniqueIdAvailability === "same" && <span className="username-status available">✓ Current</span>}
                  </div>
                  {uniqueIdError && <div className="username-error">{uniqueIdError}</div>}
                  <div className="username-rules" style={{ margin: "12px 0" }}><p>Requirements:</p><ul><li>4-20 chars</li><li>Letters, numbers, underscores</li><li>Globally unique</li></ul></div>
                  <div className="settings-uniqueid-actions">
                    <button className="wallpaper-btn secondary" onClick={() => setEditUniqueId(false)} disabled={savingUniqueId}>Cancel</button>
                    <button className="wallpaper-btn primary" onClick={handleSaveUniqueId} disabled={savingUniqueId || uniqueIdAvailability !== "available" || !validateUniqueId(newUniqueId.trim().toLowerCase())}>{savingUniqueId ? "Saving..." : "Save"}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === APPEARANCE ===
  if (activeSection === "appearance") {
    return (
      <div className="settings-page">
        <div className="settings-panel">
          <div className="settings-header-bar">
            <button className="settings-back-btn" onClick={() => setActiveSection(null)}>←</button>
            <h2 className="settings-title">Appearance</h2>
          </div>
          <div className="settings-scroll-content">
            {/* Theme */}
            <div className="pref-section">
              <label className="pref-section-label">Theme</label>
              <div className="pref-chip-group">
                {["dark", "light", "system"].map(theme => (
                  <button key={theme} className={`pref-chip ${appearanceSettings.theme === theme ? "active" : ""}`} onClick={() => updateAppearance({ theme })}>
                    {theme === "dark" ? "🌙" : theme === "light" ? "☀️" : "🖥️"} {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div className="pref-section">
              <label className="pref-section-label">Accent Color</label>
              <div className="accent-color-grid">
                {ACCENT_COLORS.map(ac => (
                  <button key={ac.id} className={`accent-color-swatch ${appearanceSettings.accentColor === ac.id ? "active" : ""}`} style={{ background: ac.color }} onClick={() => updateAppearance({ accentColor: ac.id })} title={ac.label}>
                    {appearanceSettings.accentColor === ac.id && <span className="accent-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Bubble Style */}
            <div className="pref-section">
              <label className="pref-section-label">Chat Bubble Style</label>
              <div className="bubble-style-grid">
                {CHAT_BUBBLE_STYLES.map(bs => (
                  <button key={bs.id} className={`bubble-style-card ${appearanceSettings.chatBubbleStyle === bs.id ? "active" : ""}`} onClick={() => updateAppearance({ chatBubbleStyle: bs.id })}>
                    <div className="bubble-preview">
                      <div className={`bubble-sample ${bs.id}`} />
                      <div className={`bubble-sample ${bs.id} sent`} />
                    </div>
                    <span>{bs.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="pref-section">
              <label className="pref-section-label">Font Size</label>
              <div className="pref-chip-group">
                {FONT_SIZES.map(fs => (
                  <button key={fs.id} className={`pref-chip ${appearanceSettings.fontSize === fs.id ? "active" : ""}`} onClick={() => updateAppearance({ fontSize: fs.id })}>
                    {fs.label} ({fs.value})
                  </button>
                ))}
              </div>
            </div>

            {/* Animations */}
            <div className="pref-section">
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <label className="pref-section-label">Animations</label>
                  <span className="pref-toggle-desc">Smooth transitions and effects</span>
                </div>
                <button className={`premium-toggle ${appearanceSettings.animations ? "active" : ""}`} onClick={() => updateAppearance({ animations: !appearanceSettings.animations })}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === PRIVACY ===
  if (activeSection === "privacy") {
    const privacyItems = [
      { id: "onlineStatus", label: "Online Status", desc: "Show when you're online", icon: "🟢" },
      { id: "lastSeen", label: "Last Seen", desc: "Show your last seen time", icon: "🕐" },
      { id: "profilePhoto", label: "Profile Photo", desc: "Show your profile picture", icon: "📷" },
      { id: "bio", label: "Bio", desc: "Show your bio/about", icon: "📝" },
      { id: "readReceipts", label: "Read Receipts", desc: "Show when you've read messages", icon: "👁️" },
      { id: "typingIndicator", label: "Typing Indicator", desc: "Show when you're typing", icon: "✏️" },
      { id: "calls", label: "Calls", desc: "Allow incoming calls from friends", icon: "📞" },
      { id: "friendRequests", label: "Friend Requests", desc: "Allow friend requests", icon: "👥" },
    ];
    return (
      <div className="settings-page">
        <div className="settings-panel">
          <div className="settings-header-bar">
            <button className="settings-back-btn" onClick={() => setActiveSection(null)}>←</button>
            <h2 className="settings-title">Privacy</h2>
          </div>
          <div className="settings-scroll-content">
            <div className="pref-section">
              <label className="pref-section-label">Who can see my info</label>
              {privacyItems.map(item => (
                <div key={item.id} className="pref-toggle-row">
                  <div className="pref-toggle-info">
                    <span className="pref-toggle-icon">{item.icon}</span>
                    <div>
                      <strong className="pref-toggle-label">{item.label}</strong>
                      <span className="pref-toggle-desc">{item.desc}</span>
                    </div>
                  </div>
                  <button className={`premium-toggle ${privacySettings[item.id] !== false ? "active" : ""}`} onClick={() => togglePrivacy(item.id)}>
                    <span className="premium-toggle-knob" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === NOTIFICATIONS (WhatsApp + Discord Style) ===
  if (activeSection === "notifications") {
    return (
      <div className="settings-page">
        <div className="settings-panel">
          <div className="settings-header-bar">
            <button className="settings-back-btn" onClick={() => setActiveSection(null)}>←</button>
            <h2 className="settings-title">Notifications</h2>
          </div>
          <div className="settings-scroll-content">
            {/* Global Mute All - Top priority */}
            <div className="pref-section notif-section-highlight">
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <span className="pref-toggle-icon">🔕</span>
                  <div>
                    <strong className="pref-toggle-label">Mute All Notifications</strong>
                    <span className="pref-toggle-desc">Globally mute all notifications</span>
                  </div>
                </div>
                <button className={`premium-toggle ${notifSettings.muteAll ? "active danger" : ""}`} onClick={() => toggleNotif("muteAll")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
            </div>

            {/* Messages Section */}
            <div className="notif-section-group">
              <div className="notif-section-header">
                <span className="notif-section-icon">💬</span>
                <h3>Messages</h3>
              </div>
              <div className="notif-section-divider" />
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Enable/Disable</strong>
                  <span className="pref-toggle-desc">Receive message notifications</span>
                </div>
                <button className={`premium-toggle ${notifSettings.messages !== false ? "active" : ""}`} onClick={() => toggleNotif("messages")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Sound</strong>
                  <span className="pref-toggle-desc">Play sound for new messages</span>
                </div>
                <button className={`premium-toggle ${notifSettings.messageSound !== false ? "active" : ""}`} onClick={() => toggleNotif("messageSound")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Popup Preview</strong>
                  <span className="pref-toggle-desc">Show message preview in popup</span>
                </div>
                <button className={`premium-toggle ${notifSettings.messagePopup !== false ? "active" : ""}`} onClick={() => toggleNotif("messagePopup")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Vibration</strong>
                  <span className="pref-toggle-desc">Vibrate on new messages</span>
                </div>
                <button className={`premium-toggle ${notifSettings.messageVibration !== false ? "active" : ""}`} onClick={() => toggleNotif("messageVibration")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Badge</strong>
                  <span className="pref-toggle-desc">Show unread badge count</span>
                </div>
                <button className={`premium-toggle ${notifSettings.messageBadge !== false ? "active" : ""}`} onClick={() => toggleNotif("messageBadge")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
            </div>

            {/* Calls Section */}
            <div className="notif-section-group">
              <div className="notif-section-header">
                <span className="notif-section-icon">📞</span>
                <h3>Calls</h3>
              </div>
              <div className="notif-section-divider" />
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Enable/Disable</strong>
                  <span className="pref-toggle-desc">Receive call notifications</span>
                </div>
                <button className={`premium-toggle ${notifSettings.calls !== false ? "active" : ""}`} onClick={() => toggleNotif("calls")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Missed Call Alerts</strong>
                  <span className="pref-toggle-desc">Notify when you miss a call</span>
                </div>
                <button className={`premium-toggle ${notifSettings.missedCallAlerts !== false ? "active" : ""}`} onClick={() => toggleNotif("missedCallAlerts")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
            </div>

            {/* Friends Section */}
            <div className="notif-section-group">
              <div className="notif-section-header">
                <span className="notif-section-icon">👥</span>
                <h3>Friends</h3>
              </div>
              <div className="notif-section-divider" />
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Friend Requests</strong>
                  <span className="pref-toggle-desc">Notify when someone sends a friend request</span>
                </div>
                <button className={`premium-toggle ${notifSettings.friends !== false ? "active" : ""}`} onClick={() => toggleNotif("friends")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
              <div className="pref-toggle-row">
                <div className="pref-toggle-info">
                  <strong className="pref-toggle-label">Friend Accepted</strong>
                  <span className="pref-toggle-desc">Notify when a friend request is accepted</span>
                </div>
                <button className={`premium-toggle ${notifSettings.friendAccepted !== false ? "active" : ""}`} onClick={() => toggleNotif("friendAccepted")}>
                  <span className="premium-toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === ACCOUNT ===
  if (activeSection === "account") {
    return (
      <div className="settings-page">
        <div className="settings-panel">
          <div className="settings-header-bar">
            <button className="settings-back-btn" onClick={() => setActiveSection(null)}>←</button>
            <h2 className="settings-title">Account</h2>
          </div>
          <div className="account-section">
            <div className="account-info-card">
              <div className="account-avatar"><img src={user?.photoURL || ""} alt="" /></div>
              <div className="account-details">
                <strong>{profile.displayName || user?.displayName || "User"}</strong>
                <span>@{profile.uniqueId || profile.username || "user"}</span>
                <span className="account-email">{user?.email || ""}</span>
              </div>
            </div>
            <div className="account-actions">
              <button className="wallpaper-btn secondary" onClick={onLogout}>Log Out</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // === LANGUAGE ===
  if (activeSection === "language") {
    const filteredLangs = LANGUAGE_LIST.filter(l => l.name.toLowerCase().includes(langSearch.toLowerCase()) || l.code.toLowerCase().includes(langSearch.toLowerCase()));
    const cl = i18n.language;
    return (
      <div className="settings-page">
        <div className="settings-panel settings-language-panel">
          <div className="settings-header-bar">
            <button className="settings-back-btn" onClick={() => setActiveSection(null)}>←</button>
            <h2 className="settings-title">{t("settings.language")}</h2>
          </div>
          <div className="language-search-wrap">
            <span className="language-search-icon">🔍</span>
            <input className="language-search-input" type="text" placeholder={t("common.search") + "..."} value={langSearch} onChange={e => setLangSearch(e.target.value)} autoFocus />
            {langSearch && <button className="language-search-clear" onClick={() => setLangSearch("")}>✕</button>}
          </div>
          <div className="language-list">
            {filteredLangs.map(l => {
              const isActive = cl === l.code;
              return (
                <button key={l.code} className={`language-item ${isActive ? "active" : ""}`} onClick={async () => { await i18n.changeLanguage(l.code); localStorage.setItem("chatsphere-language", l.code); await persistLanguage(user, l.code); }}>
                  <span className="language-flag">{l.flag}</span>
                  <span className="language-name">{l.name}</span>
                  {isActive && <span className="language-check">✓</span>}
                </button>
              );
            })}
            {filteredLangs.length === 0 && <div className="language-empty"><p>{t("common.noResults")}</p></div>}
          </div>
        </div>
      </div>
    );
  }

  // === MAIN MENU ===
  return (
    <div className="settings-page">
      <div className="settings-panel">
        <div className="settings-header-bar">
          <button className="settings-back-btn" onClick={onClose}>←</button>
          <h2 className="settings-title">Settings</h2>
        </div>
        <div className="settings-scroll-content">
          {settingsCards.map(card => (
            <button key={card.id} className="settings-card clickable" onClick={() => setActiveSection(card.id)}>
              <span className="settings-card-icon">{card.icon}</span>
              <div className="settings-card-info">
                <strong className="settings-card-title">{card.title}</strong>
                <span className="settings-card-desc">{card.desc}</span>
              </div>
              <span className="settings-card-arrow">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
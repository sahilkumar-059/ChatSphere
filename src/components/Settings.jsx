import ProfileEditor from "./ProfileEditor";

const wallpapers = [
  { id: "aurora", label: "Aurora" },
  { id: "midnight", label: "Midnight" },
  { id: "glass", label: "Glass" },
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
  return (
    <div className="settings-page">
      <section className="settings-panel">
        {/* Profile Editor replaces old ProfileCard */}
        <ProfileEditor
          user={user}
          profile={profile}
          onProfileChange={onProfileChange}
          onSave={onSaveProfile}
          onClose={onClose}
        />

        <div className="settings-grid">
          <button className="setting-card" onClick={onToggleTheme}>
            <div>
              <strong>Dark / Light Mode</strong>
              <span>Switch between polished chat themes.</span>
            </div>
            <span className="setting-value">{settings.themeMode === "dark" ? "Dark" : "Light"}</span>
          </button>

          <button className="setting-card" onClick={onToggleNotifications}>
            <div>
              <strong>Browser Notifications</strong>
              <span>Receive alerts for new messages.</span>
            </div>
            <span className="setting-value">{settings.notificationsEnabled ? "On" : "Off"}</span>
          </button>

          <button className="setting-card" onClick={onToggleReadReceipts}>
            <div>
              <strong>Read Receipts</strong>
              <span>Show sent, delivered, and seen states.</span>
            </div>
            <span className="setting-value">{settings.readReceiptsEnabled ? "On" : "Off"}</span>
          </button>

          <div className="setting-card stack">
            <div>
              <strong>Chat Wallpaper</strong>
              <span>Pick a background style for the chat pane.</span>
            </div>

            <div className="wallpaper-group">
              {wallpapers.map((wallpaper) => (
                <button
                  key={wallpaper.id}
                  className={`wallpaper-chip ${settings.wallpaper === wallpaper.id ? "active" : ""}`}
                  onClick={() => onWallpaperChange(wallpaper.id)}
                >
                  {wallpaper.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-footer">
          <div className="account-card">
            <strong>Account</strong>
            <span>{user?.uid || "No account connected"}</span>
            <button className="secondary-button danger" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
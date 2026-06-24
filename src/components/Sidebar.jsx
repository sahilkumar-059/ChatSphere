const navItems = [
  { id: "Home", icon: "🏠" },
  { id: "Chats", icon: "💬" },
  { id: "Friends", icon: "👥" },
  { id: "Calls", icon: "📞" },
  { id: "Notifications", icon: "🔔" },
  { id: "Settings", icon: "⚙️" },
];

export default function Sidebar({
  user,
  activeTab,
  onTabChange,
  onOpenSettings,
  onLogin,
  onLogout,
  onToggleSidebar,
  sidebarOpen,
  unreadCount,
}) {
  return (
    <aside className={`sidebar-shell ${sidebarOpen ? "open" : "collapsed"}`}>
      <div className="sidebar-top">
        <div>
          <p className="eyebrow">ChatSphere</p>
          <h1>Messages</h1>
        </div>

        <button className="icon-button" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          {sidebarOpen ? "✕" : "☰"}
        </button>
      </div>

      {user ? (
        <div className="sidebar-profile">
          <img src={user.photoURL} alt={user.displayName || "Profile"} />
          <div>
            <strong>{user.displayName}</strong>
            <span>{user.email}</span>
          </div>
        </div>
      ) : (
        <button className="login-button" onClick={onLogin}>
          Sign in with Google
        </button>
      )}

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => {
              if (item.id === "Settings") {
                onOpenSettings();
              } else {
                onTabChange(item.id);
              }
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.id}</span>
            {item.id === "Notifications" && unreadCount > 0 ? (
              <span className="nav-badge">{unreadCount}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-actions">
        <button className="secondary-button" onClick={onOpenSettings}>
          Open Settings
        </button>

        {user ? (
          <button className="secondary-button danger" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </div>
    </aside>
  );
}

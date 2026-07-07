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
  onOpenSearchFriends,
  onLogout,
  onToggleSidebar,
  sidebarOpen,
  unreadCount,
  incomingFriendCount,
}) {
  const [homeItem, ...otherNavItems] = navItems;

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

      <div className="sidebar-profile">
        <img src={user?.photoURL || ""} alt={user?.displayName || "Profile"} />
        <div>
          <strong>{user?.displayName || "ChatSphere User"}</strong>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === homeItem.id ? "active" : ""}`}
          onClick={() => onTabChange(homeItem.id)}
        >
          <span className="nav-icon">{homeItem.icon}</span>
          <span>{homeItem.id}</span>
        </button>

        <button type="button" className="sidebar-search-friends" onClick={onOpenSearchFriends}>
          <span className="nav-icon">🔍</span>
          <span>Search Friends</span>
          {incomingFriendCount > 0 ? <span className="nav-badge">{incomingFriendCount}</span> : null}
        </button>

        {otherNavItems.map((item) => (
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
            {item.id === "Friends" && incomingFriendCount > 0 ? (
              <span className="nav-badge">{incomingFriendCount}</span>
            ) : null}
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

        <button className="secondary-button danger" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}

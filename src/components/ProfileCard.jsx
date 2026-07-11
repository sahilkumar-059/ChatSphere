export default function ProfileCard({ user, profile, onBioChange, online, lastSeenLabel, onOpenUsernameSetup, onOpenEditUsername }) {
  const handleCopyUsername = () => {
    if (profile.username) {
      navigator.clipboard.writeText(`@${profile.username}`);
    }
  };

  const handleUsernameClick = () => {
    if (profile.username) {
      onOpenEditUsername?.();
    } else {
      onOpenUsernameSetup?.();
    }
  };

  return (
    <section className="profile-card">
      <div className="profile-avatar-wrap">
        <img src={user?.photoURL} alt={user?.displayName || "Profile"} className="profile-avatar" />
        <span className={`presence-dot ${online ? "online" : "offline"}`} />
      </div>

      <div className="profile-copy">
        <h3>{user?.displayName || "Guest user"}</h3>
        <div className="profile-username-row">
          <span className="profile-username clickable" onClick={handleUsernameClick}>@{profile.username || "No username"}</span>
          <button className="icon-button small" onClick={handleCopyUsername} aria-label="Copy username">
            📋
          </button>
        </div>
        <span>{online ? "Online now" : lastSeenLabel}</span>
      </div>

      <label className="bio-field">
        <span>Bio / Status</span>
        <textarea
          value={profile.bio}
          onChange={(event) => onBioChange(event.target.value)}
          placeholder="Write a short bio..."
          rows={4}
        />
      </label>
    </section>
  );
}
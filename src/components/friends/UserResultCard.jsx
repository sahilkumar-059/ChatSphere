import { RELATIONSHIP } from "../../services/friendService";

const STATUS_LABELS = {
  [RELATIONSHIP.FRIENDS]: "Friends",
  [RELATIONSHIP.PENDING_OUT]: "Request Sent",
  [RELATIONSHIP.PENDING_IN]: "Pending",
};

export default function UserResultCard({ user, relationship, onAddFriend, loading }) {
  const isActionable = relationship === RELATIONSHIP.NONE;
  const statusLabel = STATUS_LABELS[relationship];

  return (
    <article className="friend-user-card">
      <div className="friend-user-avatar-wrap">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.fullName} className="friend-user-avatar" />
        ) : (
          <div className="friend-user-avatar fallback">{user.fullName?.charAt(0) || "?"}</div>
        )}
        <span className={`presence-dot ${user.isOnline ? "online" : "offline"}`} />
      </div>

      <div className="friend-user-info">
        <strong>{user.fullName}</strong>
        <span>@{user.username || "user"}</span>
        <p className={`friend-status-label ${user.isOnline ? "online" : "offline"}`}>
          {user.isOnline ? "Online" : "Offline"}
        </p>
      </div>

      {isActionable ? (
        <button type="button" className="friend-action-button" onClick={() => onAddFriend(user)} disabled={loading}>
          {loading ? "Sending…" : "Add Friend"}
        </button>
      ) : (
        <span className={`friend-state-pill ${relationship}`}>{statusLabel}</span>
      )}
    </article>
  );
}

import { useState } from "react";
import { acceptFriendRequest, rejectFriendRequest } from "../../services/friendService";
import "../../styles/Friends.css";

function IncomingRequestCard({ request, onAccept, onReject, loadingId }) {
  const isLoading = loadingId === request.id;

  return (
    <article className="friend-request-card">
      <div className="friend-user-avatar-wrap">
        {request.fromPhotoURL ? (
          <img src={request.fromPhotoURL} alt={request.fromUserName} className="friend-user-avatar" />
        ) : (
          <div className="friend-user-avatar fallback">{request.fromUserName?.charAt(0) || "?"}</div>
        )}
      </div>

      <div className="friend-user-info">
        <strong>{request.fromUserName}</strong>
        <span>@{request.fromUsername || "user"}</span>
        <p className="friends-subtitle">Sent you a friend request</p>
      </div>

      <div className="friend-request-actions">
        <button
          type="button"
          className="friend-action-button"
          onClick={() => onAccept(request)}
          disabled={isLoading}
        >
          {isLoading ? "Accepting…" : "Accept"}
        </button>
        <button
          type="button"
          className="friend-action-button secondary"
          onClick={() => onReject(request)}
          disabled={isLoading}
        >
          Reject
        </button>
      </div>
    </article>
  );
}

function FriendListCard({ friend }) {
  return (
    <article className="friend-user-card compact">
      <div className="friend-user-avatar-wrap">
        {friend.friendPhotoURL ? (
          <img src={friend.friendPhotoURL} alt={friend.friendFullName} className="friend-user-avatar" />
        ) : (
          <div className="friend-user-avatar fallback">{friend.friendFullName?.charAt(0) || "?"}</div>
        )}
      </div>

      <div className="friend-user-info">
        <strong>{friend.friendFullName}</strong>
        <span>@{friend.friendUsername || "user"}</span>
      </div>

      <span className="friend-state-pill friends">Friends</span>
    </article>
  );
}

export default function FriendRequestsPage({ friendData, onOpenSearch }) {
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAccept = async (request) => {
    setLoadingId(request.id);
    setError("");
    setSuccess("");
    try {
      await acceptFriendRequest(request);
      setSuccess(`You are now friends with ${request.fromUserName}.`);
    } catch (err) {
      setError(err.message || "Could not accept request.");
    } finally {
      setLoadingId("");
    }
  };

  const handleReject = async (request) => {
    setLoadingId(request.id);
    setError("");
    setSuccess("");
    try {
      await rejectFriendRequest(request.id);
    } catch (err) {
      setError(err.message || "Could not reject request.");
    } finally {
      setLoadingId("");
    }
  };

  return (
    <div className="friends-page-shell">
      <section className="friends-page-panel">
        <div className="friends-panel-header">
          <div>
            <p className="eyebrow">Connections</p>
            <h2>Friend Requests</h2>
            <p className="friends-subtitle">Manage incoming requests and view your friends.</p>
          </div>
          <button type="button" className="primary-button" onClick={onOpenSearch}>
            Search Friends
          </button>
        </div>

        {error ? <div className="friends-message error">{error}</div> : null}
        {success ? <div className="friends-message success">{success}</div> : null}

        <div className="friends-section">
          <h3>
            Incoming Requests
            {friendData.incoming.length > 0 ? <span className="friends-count-badge">{friendData.incoming.length}</span> : null}
          </h3>

          {friendData.incoming.length === 0 ? (
            <div className="friends-empty-state inline">
              <p>No pending friend requests.</p>
            </div>
          ) : (
            <div className="friends-results">
              {friendData.incoming.map((request) => (
                <IncomingRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  loadingId={loadingId}
                />
              ))}
            </div>
          )}
        </div>

        <div className="friends-section">
          <h3>Your Friends ({friendData.friends.length})</h3>
          {friendData.friends.length === 0 ? (
            <div className="friends-empty-state inline">
              <p>No friends yet. Search for people to connect with.</p>
            </div>
          ) : (
            <div className="friends-results">
              {friendData.friends.map((friend) => (
                <FriendListCard key={friend.id} friend={friend} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

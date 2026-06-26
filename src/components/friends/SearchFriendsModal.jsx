import { useEffect, useMemo, useState } from "react";
import UserResultCard from "./UserResultCard";
import {
  getRelationshipStatus,
  searchUsers,
  sendFriendRequest,
} from "../../services/friendService";
import "../../styles/Friends.css";

export default function SearchFriendsModal({ user, friendData, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [actionUserId, setActionUserId] = useState("");
  const [error, setError] = useState("");

  const relationshipContext = useMemo(
    () => ({
      friendIds: friendData.friendIds,
      outgoingIds: friendData.outgoingIds,
      incomingIds: friendData.incomingIds,
    }),
    [friendData.friendIds, friendData.incomingIds, friendData.outgoingIds]
  );

  useEffect(() => {
    if (!user?.uid || searchTerm.trim().length < 2) {
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const users = await searchUsers(searchTerm, user.uid);
        if (!cancelled) setResults(users);
      } catch (err) {
        if (!cancelled) setError(err.message || "Search failed. Please try again.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, user]);

  const handleAddFriend = async (targetUser) => {
    setActionUserId(targetUser.uid);
    setError("");
    try {
      const currentUserProfile = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        username: friendData.currentUsername || "",
        fullName: user.displayName,
      };
      await sendFriendRequest(currentUserProfile, targetUser);
    } catch (err) {
      setError(err.message || "Could not send friend request.");
    } finally {
      setActionUserId("");
    }
  };

  return (
    <div className="friends-overlay" onClick={onClose}>
      <section className="friends-panel search-friends-panel" onClick={(event) => event.stopPropagation()}>
        <div className="friends-panel-header">
          <div>
            <p className="eyebrow">Discover</p>
            <h2>Search Friends</h2>
            <p className="friends-subtitle">Find people by username, name, or email.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close search">
            ✕
          </button>
        </div>

        <div className="friends-search-wrap">
          <span className="friends-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            className="friends-search-input"
            type="search"
            placeholder="Search by username, name, or email…"
            value={searchTerm}
            onChange={(event) => {
              const nextTerm = event.target.value;
              setSearchTerm(nextTerm);
              if (nextTerm.trim().length < 2) {
                setResults([]);
                setSearching(false);
              }
            }}
            autoFocus
          />
        </div>

        {error ? <div className="friends-message error">{error}</div> : null}

        <div className="friends-results">
          {searching ? (
            <div className="friends-empty-state">
              <span className="friends-spinner" aria-hidden="true" />
              <p>Searching users…</p>
            </div>
          ) : searchTerm.trim().length < 2 ? (
            <div className="friends-empty-state">
              <p>Type at least 2 characters to search.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="friends-empty-state">
              <p>No users found matching &ldquo;{searchTerm}&rdquo;</p>
            </div>
          ) : (
            results.map((result) => (
              <UserResultCard
                key={result.uid}
                user={result}
                relationship={getRelationshipStatus(result.uid, relationshipContext)}
                onAddFriend={handleAddFriend}
                loading={actionUserId === result.uid}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

import { useState, useEffect, useMemo, useCallback } from "react";
import { subscribeToCallHistory, formatDuration } from "../services/callHistoryService";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const FILTERS = [
  { id: "all", label: "All Calls" },
  { id: "missed", label: "Missed Calls" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
  { id: "video", label: "Video Calls" },
  { id: "voice", label: "Voice Calls" },
];

function formatCallDateTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  if (diffDays < 7) return `${date.toLocaleDateString([], { weekday: "long" })}, ${timeStr}`;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}, ${timeStr}`;
}

function getCallIcon(direction, status) {
  if (status === "missed" || status === "rejected") {
    return { icon: "📲", color: "#ef4444", label: "Missed" };
  }
  if (direction === "incoming") {
    return { icon: "📲", color: "#22c55e", label: "Incoming" };
  }
  return { icon: "📞", color: "#3b82f6", label: "Outgoing" };
}

function getCallTypeIcon(type) {
  return type === "video" ? "📹" : "🎧";
}

function getCallStatusText(status, direction) {
  if (status === "missed") return "Missed call";
  if (status === "rejected") return direction === "outgoing" ? "Call rejected" : "Declined";
  if (status === "cancelled") return "Call cancelled";
  if (status === "answered") return direction === "incoming" ? "Incoming call" : "Outgoing call";
  return "Call";
}

export default function CallsPage({ user }) {
  const [calls, setCalls] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [userCache, setUserCache] = useState({});

  // Subscribe to call history
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribeToCallHistory(user.uid, (callList) => {
      setCalls(callList);
    });
    return unsubscribe;
  }, [user?.uid]);

  // Fetch user names for any unknown users in calls
  useEffect(() => {
    const userIds = new Set();
    calls.forEach((call) => {
      if (call.callerId && !userCache[call.callerId]) userIds.add(call.callerId);
      if (call.receiverId && !userCache[call.receiverId]) userIds.add(call.receiverId);
    });
    // Remove current user's ID
    if (user?.uid) userIds.delete(user.uid);

    if (userIds.size > 0) {
      const fetchUsers = async () => {
        const q = query(collection(db, "users"), where("__name__", "in", Array.from(userIds)));
        try {
          const snapshot = await getDocs(q);
          const newCache = { ...userCache };
          snapshot.forEach((doc) => {
            newCache[doc.id] = doc.data();
          });
          setUserCache(newCache);
        } catch (err) {
          console.error("Error fetching user data for calls:", err);
        }
      };
      fetchUsers();
    }
  }, [calls, user?.uid]);

  // Get the other party's name from a call
  const getOtherParty = useCallback(
    (call) => {
      if (call.callerId === user?.uid) {
        return call.receiverName || userCache[call.receiverId]?.displayName || userCache[call.receiverId]?.username || "Unknown";
      }
      return call.callerName || userCache[call.callerId]?.displayName || userCache[call.callerId]?.username || "Unknown";
    },
    [user?.uid, userCache]
  );

  // Get the other party's photo URL
  const getOtherPartyPhoto = useCallback(
    (call) => {
      if (call.callerId === user?.uid) {
        return userCache[call.receiverId]?.photoURL || "";
      }
      return userCache[call.callerId]?.photoURL || "";
    },
    [user?.uid, userCache]
  );

  // Determine call direction relative to current user
  const getDirection = useCallback(
    (call) => {
      if (call.callerId === user?.uid) return "outgoing";
      return "incoming";
    },
    [user?.uid]
  );

  // Filter and search calls
  const filteredCalls = useMemo(() => {
    let result = calls;

    // Apply filter
    if (activeFilter === "missed") {
      result = result.filter((c) => c.status === "missed");
    } else if (activeFilter === "incoming") {
      result = result.filter((c) => c.callerId !== user?.uid);
    } else if (activeFilter === "outgoing") {
      result = result.filter((c) => c.callerId === user?.uid);
    } else if (activeFilter === "video") {
      result = result.filter((c) => c.callType === "video");
    } else if (activeFilter === "voice") {
      result = result.filter((c) => c.callType === "voice");
    }

    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const otherName = getOtherParty(c).toLowerCase();
        return otherName.includes(q);
      });
    }

    return result;
  }, [calls, activeFilter, searchQuery, user?.uid, getOtherParty]);

  return (
    <div className="calls-page-shell">
      {/* Header */}
      <div className="calls-page-header">
        <div className="calls-page-header-left">
          <h2>Calls</h2>
          <span className="calls-count">{calls.length} total</span>
        </div>
      </div>

      {/* Search */}
      <div className="calls-search">
        <div className="calls-search-wrapper">
          <span className="calls-search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="calls-search-input"
          />
          {searchQuery && (
            <button className="calls-search-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="calls-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`calls-filter-btn ${activeFilter === f.id ? "active" : ""}`}
            onClick={() => setActiveFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Call list */}
      <div className="calls-list">
        {filteredCalls.length === 0 ? (
          <div className="calls-empty">
            <span className="calls-empty-icon">📞</span>
            <h3>No calls yet</h3>
            <p>
              {searchQuery
                ? "No calls match your search."
                : "Your call history will appear here once you make or receive a call."}
            </p>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const direction = getDirection(call);
            const otherName = getOtherParty(call);
            const photoURL = getOtherPartyPhoto(call);
            const callInfo = getCallIcon(direction, call.status);
            const typeIcon = getCallTypeIcon(call.callType);
            const statusText = getCallStatusText(call.status, direction);
            const duration = call.duration ? formatDuration(call.duration) : "";

            return (
              <div key={call.id} className="call-card">
                <div className="call-card-avatar">
                  {photoURL ? (
                    <img src={photoURL} alt={otherName} className="call-avatar-img" />
                  ) : (
                    <div className="call-avatar-placeholder">
                      {otherName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="call-card-info">
                  <div className="call-card-top">
                    <span className="call-card-name">{otherName}</span>
                    <span className="call-card-time">{formatCallDateTime(call.createdAt)}</span>
                  </div>
                  <div className="call-card-bottom">
                    <span className="call-card-status" style={{ color: callInfo.color }}>
                      <span className="call-status-icon">{callInfo.icon}</span>
                      <span className="call-status-detail">
                        {direction === "outgoing" ? "Outgoing · " : "Incoming · "}
                        {statusText}
                        {duration ? ` · ${duration}` : ""}
                      </span>
                    </span>
                    <span className="call-card-type" title={call.callType === "video" ? "Video call" : "Voice call"}>
                      {typeIcon}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
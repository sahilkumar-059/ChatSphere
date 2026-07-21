import { useState, useRef, useEffect } from "react";
import { doc, serverTimestamp, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function UniqueIdSetup({ user, onComplete }) {
  const [uniqueId, setUniqueId] = useState("");
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const checkTimerRef = useRef(null);

  const validateUniqueId = (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    return /^[a-z0-9_]{4,20}$/.test(trimmed);
  };

  const checkAvailability = async (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!validateUniqueId(trimmed)) {
      if (trimmed.length > 0) {
        setError("Must be 4-20 characters (letters, numbers, underscores only)");
      } else {
        setError("");
      }
      setAvailability(null);
      return;
    }

    setLoading(true);
    setError("");
    setAvailability(null);

    try {
      // Query by uniqueIdLower for case-insensitive lookup
      const q = query(collection(db, "users"), where("uniqueIdLower", "==", trimmed));
      const snapshot = await getDocs(q);
      const isAvailable = snapshot.empty;
      console.log(`[UniqueID] Check "${trimmed}": ${isAvailable ? "available" : "taken"} (${snapshot.size} docs found)`);
      setAvailability(isAvailable ? "available" : "taken");
    } catch (err) {
      console.error("[UniqueID] Firestore check error:", err.code, err.message);
      // Fallback: try checking by username field for backward compatibility
      try {
        const fallbackQ = query(collection(db, "users"), where("username", "==", trimmed));
        const fallbackSnapshot = await getDocs(fallbackQ);
        const isAvailable = fallbackSnapshot.empty;
        console.log(`[UniqueID] Fallback check "${trimmed}": ${isAvailable ? "available" : "taken"}`);
        setAvailability(isAvailable ? "available" : "taken");
      } catch (fallbackErr) {
        console.error("[UniqueID] Fallback also failed:", fallbackErr.code, fallbackErr.message);
        setError("Failed to check availability. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced check on input change
  const handleInputChange = (e) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
    setUniqueId(val);
    setAvailability(null);
    setError("");

    // Clear previous timer
    if (checkTimerRef.current) {
      clearTimeout(checkTimerRef.current);
    }

    // Debounce: wait 400ms after user stops typing
    if (val.trim().length >= 4) {
      checkTimerRef.current = setTimeout(() => {
        checkAvailability(val);
      }, 400);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = uniqueId.trim().toLowerCase();

    if (!validateUniqueId(trimmed)) {
      setError("Please enter a valid Unique ID (4-20 characters, letters, numbers, underscores)");
      return;
    }

    // If we haven't checked yet, check now
    if (availability === null) {
      try {
        setLoading(true);
        const q = query(collection(db, "users"), where("uniqueIdLower", "==", trimmed));
        const snapshot = await getDocs(q);
        const isAvailable = snapshot.empty;
        if (!isAvailable) {
          setAvailability("taken");
          setError("This Unique ID is already taken");
          setLoading(false);
          return;
        }
        setAvailability("available");
        setLoading(false);
      } catch (err) {
        console.error("[UniqueID] Submit check error:", err.code, err.message);
        setError("Failed to verify availability. Please try again.");
        setLoading(false);
        return;
      }
    }

    if (availability !== "available") {
      setError("This Unique ID is already taken");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(
        userRef,
        {
          uniqueId: trimmed,
          uniqueIdLower: trimmed,
          fullName: user.displayName || "ChatSphere User",
          email: user.email || "",
          photoURL: user.photoURL || "",
          isOnline: true,
          lastSeen: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("[UniqueID] Saved successfully:", trimmed);
      onComplete();
    } catch (err) {
      console.error("[UniqueID] Save error:", err.code, err.message);
      setError(err.message || "Failed to save Unique ID");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="username-setup-container">
      <div className="username-setup-card">
        <div className="username-setup-header">
          <div className="username-setup-icon">@</div>
          <h1>Create Your Unique ID</h1>
          <p>This will be your unique identity on ChatSphere Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="username-setup-form">
          <div className="username-input-group">
            <div className="username-input-wrapper">
              <span className="username-prefix">@</span>
              <input
                type="text"
                value={uniqueId}
                onChange={handleInputChange}
                placeholder="your_unique_id"
                className="username-input"
                disabled={saving}
                autoFocus
                autoComplete="off"
              />
            </div>

            {loading && <span className="username-status checking">Checking...</span>}
            {!loading && availability === "available" && (
              <span className="username-status available">✅ Unique ID is available</span>
            )}
            {!loading && availability === "taken" && (
              <span className="username-status taken">❌ This Unique ID is already taken</span>
            )}
          </div>

          {error && <div className="username-error">{error}</div>}

          <div className="username-rules">
            <p>Unique ID requirements:</p>
            <ul>
              <li>4-20 characters</li>
              <li>Letters, numbers, and underscores only</li>
              <li>No spaces or special characters</li>
              <li>Must be globally unique</li>
            </ul>
          </div>

          <button
            type="submit"
            className="primary-button username-submit-button"
            disabled={saving || loading || availability !== "available" || !validateUniqueId(uniqueId.trim().toLowerCase())}
          >
            {saving ? "Creating..." : "Enter ChatSphere"}
          </button>
        </form>
      </div>
    </div>
  );
}
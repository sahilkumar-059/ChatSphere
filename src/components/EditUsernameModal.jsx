import { useState } from "react";
import { checkUsernameAvailability, updateUsername } from "../services/authService";

export default function EditUsernameModal({ user, currentUsername, onClose, onUpdate }) {
  const [username, setUsername] = useState(currentUsername);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validateUsername = (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    return /^[a-z0-9_]{3,20}$/.test(trimmed);
  };

  const handleUsernameChange = async (value) => {
    setUsername(value);
    setError("");
    setAvailability(null);

    const trimmed = value.trim().toLowerCase();
    
    // If same as current, mark as available
    if (trimmed === currentUsername) {
      setAvailability("available");
      return;
    }

    if (!validateUsername(trimmed)) {
      if (trimmed.length > 0) {
        setError("Username must be 3-20 characters (letters, numbers, underscores only)");
      }
      return;
    }

    if (trimmed.length >= 3) {
      setLoading(true);
      try {
        const isAvailable = await checkUsernameAvailability(trimmed);
        setAvailability(isAvailable ? "available" : "taken");
      } catch {
        setError("Failed to check username availability");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();

    if (!validateUsername(trimmed)) {
      setError("Please enter a valid username");
      return;
    }

    if (availability !== "available") {
      setError("Username is not available");
      return;
    }

    if (trimmed === currentUsername) {
      onClose();
      return;
    }

    setSaving(true);
    setError("");

    try {
      await updateUsername(user.uid, trimmed);
      onUpdate(trimmed);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Username</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="username-input-group">
            <div className="username-input-wrapper">
              <span className="username-prefix">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                placeholder="username"
                className="username-input"
                disabled={saving}
                autoFocus
              />
            </div>

            {loading && <span className="username-status checking">Checking...</span>}
            {availability === "available" && <span className="username-status available">✓ Username Available</span>}
            {availability === "taken" && <span className="username-status taken">✗ Username Already Taken</span>}
          </div>

          {error && <div className="username-error">{error}</div>}

          <div className="username-rules">
            <p>Username requirements:</p>
            <ul>
              <li>3-20 characters</li>
              <li>Letters, numbers, and underscores only</li>
              <li>No spaces or special characters</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={saving || availability !== "available" || !validateUsername(username.trim().toLowerCase())}
            >
              {saving ? "Updating..." : "Update Username"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

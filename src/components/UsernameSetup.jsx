import { useState } from "react";
import { checkUsernameAvailability, saveUsername } from "../services/authService";

export default function UsernameSetup({ user, onComplete }) {
  const [username, setUsername] = useState("");
  const [availability, setAvailability] = useState(null); // null, "available", "taken"
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const validateUsername = (value) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return false;
    // Username must be 3-20 characters, alphanumeric and underscores only
    return /^[a-z0-9_]{3,20}$/.test(trimmed);
  };

  const handleUsernameChange = async (value) => {
    setUsername(value);
    setError("");
    setAvailability(null);

    const trimmed = value.trim().toLowerCase();
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

    setSaving(true);
    setError("");

    try {
      await saveUsername(user, trimmed);
      onComplete();
    } catch (err) {
      setError(err.message || "Failed to save username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="username-setup-container">
      <div className="username-setup-card">
        <div className="username-setup-header">
          <div className="username-setup-icon">@</div>
          <h1>Choose Your Username</h1>
          <p>This will be your unique identity on ChatSphere Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="username-setup-form">
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

          <button
            type="submit"
            className="primary-button username-submit-button"
            disabled={saving || availability !== "available" || !validateUsername(username.trim().toLowerCase())}
          >
            {saving ? "Creating Profile..." : "Continue to ChatSphere"}
          </button>
        </form>
      </div>
    </div>
  );
}

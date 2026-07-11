import { useState, useRef, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

const STATUS_OPTIONS = [
  { id: "online", label: "Online", emoji: "🟢" },
  { id: "away", label: "Away", emoji: "🟡" },
  { id: "busy", label: "Busy", emoji: "🔴" },
];

export default function ProfileEditor({
  user,
  profile,
  onProfileChange,
  onSave,
  onClose,
}) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState(profile.username || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [status, setStatus] = useState(profile.status || "online");
  const [photoPreview, setPhotoPreview] = useState(user?.photoURL || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);
  const usernameTimerRef = useRef(null);

  // Sync when profile changes from Firestore
  useEffect(() => {
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setPhone(profile.phone || "");
    setStatus(profile.status || "online");
    if (user?.photoURL && !photoFile) {
      setPhotoPreview(user.photoURL);
    }
  }, [profile, user]);

  // Username uniqueness check with debounce
  useEffect(() => {
    if (!username.trim() || username === profile.username) {
      setUsernameError("");
      return;
    }

    if (usernameTimerRef.current) {
      clearTimeout(usernameTimerRef.current);
    }

    usernameTimerRef.current = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", username.trim()));
        const snapshot = await getDocs(q);
        const isTaken = snapshot.docs.some((doc) => doc.id !== user?.uid);
        setUsernameError(isTaken ? "Username already taken" : "");
      } catch (err) {
        console.error("Error checking username:", err);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => {
      if (usernameTimerRef.current) {
        clearTimeout(usernameTimerRef.current);
      }
    };
  }, [username, profile.username, user?.uid]);

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "error");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be less than 5MB", "error");
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate
    if (!displayName.trim()) {
      showToast("Full name is required", "error");
      return;
    }

    if (!username.trim()) {
      showToast("Username is required", "error");
      return;
    }

    if (usernameError) {
      showToast("Please fix the username before saving", "error");
      return;
    }

    if (bio.length > 150) {
      showToast("Bio must be 150 characters or less", "error");
      return;
    }

    setIsSaving(true);

    try {
      let photoURL = user.photoURL || "";

      // Upload new photo if changed
      if (photoFile) {
        const imageRef = storageRef(
          storage,
          `profile-photos/${user.uid}/${Date.now()}-${photoFile.name}`
        );
        await uploadBytes(imageRef, photoFile);
        photoURL = await getDownloadURL(imageRef);
      }

      // Update profile in parent state
      onProfileChange({
        ...profile,
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        status,
        photoURL,
      });

      // Save to Firestore via parent
      await onSave({
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        status,
        photoURL,
      });

      showToast("Profile updated successfully");
    } catch (error) {
      console.error("Error saving profile:", error);
      showToast("Failed to save profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="profile-editor">
      {/* Toast notification */}
      {toast && (
        <div className={`profile-toast ${toast.type === "error" ? "toast-error" : "toast-success"}`}>
          <span>{toast.type === "error" ? "✕" : "✓"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="profile-editor-header">
        <button className="profile-editor-back" onClick={onClose}>
          ←
        </button>
        <h2>Profile</h2>
      </div>

      {/* Photo section */}
      <div className="profile-editor-photo-section">
        <div className="profile-editor-photo-wrap">
          <img
            src={photoPreview || "/default-avatar.png"}
            alt="Profile"
            className="profile-editor-photo"
          />
          <button
            className="profile-editor-camera-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Change profile photo"
          >
            📷
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePhotoSelect}
        />
        <button
          className="profile-editor-photo-change"
          onClick={() => fileInputRef.current?.click()}
        >
          Change Profile Photo
        </button>
      </div>

      {/* Name and username display */}
      <div className="profile-editor-name-section">
        <h3 className="profile-editor-fullname">{displayName || "Your Name"}</h3>
        <span className="profile-editor-username-display">
          @{username || "username"}
        </span>
        <span className={`profile-editor-status-badge status-${status}`}>
          {STATUS_OPTIONS.find((s) => s.id === status)?.emoji}{" "}
          {STATUS_OPTIONS.find((s) => s.id === status)?.label || "Online"}
        </span>
      </div>

      <div className="profile-editor-divider" />

      {/* Form */}
      <div className="profile-editor-form">
        {/* Full Name */}
        <div className="profile-editor-field">
          <label className="profile-editor-label">Full Name</label>
          <input
            type="text"
            className="profile-editor-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your full name"
            maxLength={50}
          />
        </div>

        {/* Username */}
        <div className="profile-editor-field">
          <label className="profile-editor-label">Username</label>
          <div className="profile-editor-input-wrap">
            <span className="profile-editor-input-prefix">@</span>
            <input
              type="text"
              className={`profile-editor-input with-prefix ${usernameError ? "input-error" : ""}`}
              value={username}
              onChange={(e) => {
                // Only allow alphanumeric and underscores
                const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "");
                setUsername(val);
              }}
              placeholder="username"
              maxLength={30}
            />
            {usernameChecking && (
              <span className="profile-editor-input-icon checking">⟳</span>
            )}
            {!usernameChecking && username && !usernameError && username !== profile.username && (
              <span className="profile-editor-input-icon valid">✓</span>
            )}
          </div>
          {usernameError && (
            <span className="profile-editor-field-error">{usernameError}</span>
          )}
          <span className="profile-editor-field-hint">
            Only letters, numbers, and underscores. Must be unique.
          </span>
        </div>

        {/* Email (read-only) */}
        <div className="profile-editor-field">
          <label className="profile-editor-label">Email</label>
          <div className="profile-editor-input readonly">
            {user?.email || "No email"}
          </div>
          <span className="profile-editor-field-hint">Email cannot be changed</span>
        </div>

        {/* Phone */}
        <div className="profile-editor-field">
          <label className="profile-editor-label">Phone Number</label>
          <input
            type="tel"
            className="profile-editor-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            maxLength={20}
          />
          <span className="profile-editor-field-hint">Optional</span>
        </div>

        {/* Status */}
        <div className="profile-editor-field">
          <label className="profile-editor-label">Status</label>
          <div className="profile-editor-status-options">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`profile-editor-status-btn ${status === opt.id ? "active" : ""}`}
                onClick={() => setStatus(opt.id)}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="profile-editor-field">
          <label className="profile-editor-label">Bio / About</label>
          <div className="profile-editor-textarea-wrap">
            <textarea
              className="profile-editor-textarea"
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 150) {
                  setBio(e.target.value);
                }
              }}
              placeholder="Write something about yourself..."
              rows={4}
            />
            <span className={`profile-editor-char-count ${bio.length >= 150 ? "char-limit" : ""}`}>
              {bio.length}/150
            </span>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="profile-editor-actions">
        <button
          className="profile-editor-save-btn"
          onClick={handleSave}
          disabled={isSaving || !!usernameError}
        >
          {isSaving ? (
            <>
              <span className="profile-editor-spinner" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </div>
    </div>
  );
}
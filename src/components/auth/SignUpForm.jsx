import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function SignUpForm() {
  const { signUp, actionLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await signUp({ fullName, username, email, password });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label htmlFor="signup-fullname">Full Name</label>
        <input
          id="signup-fullname"
          type="text"
          placeholder="Your full name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          autoComplete="name"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-username">Username</label>
        <input
          id="signup-username"
          type="text"
          placeholder="Choose a username"
          value={username}
          onChange={(event) => setUsername(event.target.value.replace(/\s/g, ""))}
          required
          autoComplete="username"
          minLength={3}
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="new-password"
          minLength={6}
        />
      </div>

      <button type="submit" className="auth-submit" disabled={actionLoading}>
        {actionLoading ? (
          <span className="auth-button-loading">
            <span className="auth-spinner" aria-hidden="true" />
            Creating account…
          </span>
        ) : (
          "Create Account"
        )}
      </button>
    </form>
  );
}

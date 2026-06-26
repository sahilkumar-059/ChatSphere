import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function SignInForm({ onForgotPassword }) {
  const { signIn, actionLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await signIn(email, password);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label htmlFor="signin-email">Email</label>
        <input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div className="auth-field">
        <label htmlFor="signin-password">Password</label>
        <input
          id="signin-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoComplete="current-password"
          minLength={6}
        />
      </div>

      <div style={{ textAlign: "right" }}>
        <button type="button" className="auth-link-button" onClick={onForgotPassword}>
          Forgot password?
        </button>
      </div>

      <button type="submit" className="auth-submit" disabled={actionLoading}>
        {actionLoading ? (
          <span className="auth-button-loading">
            <span className="auth-spinner" aria-hidden="true" />
            Signing in…
          </span>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}

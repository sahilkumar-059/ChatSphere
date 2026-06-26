import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordForm({ onBackToSignIn }) {
  const { resetPassword, actionLoading } = useAuth();
  const [email, setEmail] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    await resetPassword(email);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "left", margin: 0 }}>
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <div className="auth-field">
        <label htmlFor="reset-email">Email</label>
        <input
          id="reset-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <button type="submit" className="auth-submit" disabled={actionLoading}>
        {actionLoading ? (
          <span className="auth-button-loading">
            <span className="auth-spinner" aria-hidden="true" />
            Sending email…
          </span>
        ) : (
          "Send Reset Email"
        )}
      </button>

      <div className="auth-footer">
        <button type="button" className="auth-link-button" onClick={onBackToSignIn}>
          Back to Sign In
        </button>
      </div>
    </form>
  );
}

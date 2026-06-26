import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ForgotPasswordForm from "./ForgotPasswordForm";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";
import "../../styles/Auth.css";

export default function AuthPage() {
  const { user, authLoading, actionLoading, error, successMessage, signInGoogle, clearMessages } = useAuth();
  const [mode, setMode] = useState("signin");
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = location.state?.from || "/";

  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  useEffect(() => {
    clearMessages();
  }, [mode, clearMessages]);

  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-spinner" aria-hidden="true" />
        <p>Loading ChatSphere…</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to={redirectPath} replace />;
  }

  const showForgotPassword = mode === "forgot";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <p className="eyebrow">ChatSphere Pro</p>
          <h1>{showForgotPassword ? "Reset Password" : "Welcome back"}</h1>
          <p>
            {showForgotPassword
              ? "We'll help you get back into your account."
              : "Sign in to continue to your conversations."}
          </p>
        </div>

        {!showForgotPassword ? (
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === "signin" ? "active" : ""}`}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === "signup" ? "active" : ""}`}
              onClick={() => setMode("signup")}
            >
              Sign Up
            </button>
          </div>
        ) : null}

        {error ? <div className="auth-message error">{error}</div> : null}
        {successMessage ? <div className="auth-message success">{successMessage}</div> : null}

        {showForgotPassword ? (
          <ForgotPasswordForm onBackToSignIn={() => setMode("signin")} />
        ) : mode === "signup" ? (
          <SignUpForm />
        ) : (
          <SignInForm onForgotPassword={() => setMode("forgot")} />
        )}

        {!showForgotPassword ? (
          <>
            <div className="auth-divider">or</div>

            <button
              type="button"
              className="auth-google-button"
              onClick={() => signInGoogle()}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <span className="auth-button-loading">
                  <span className="auth-spinner" aria-hidden="true" />
                  Connecting…
                </span>
              ) : (
                <>
                  <span aria-hidden="true">G</span>
                  Continue with Google
                </>
              )}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

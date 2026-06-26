import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import {
  getAuthErrorMessage,
  logoutUser,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const clearMessages = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  const runAuthAction = useCallback(async (action) => {
    setActionLoading(true);
    clearMessages();
    try {
      const result = await action();
      return result;
    } catch (err) {
      setError(getAuthErrorMessage(err));
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [clearMessages]);

  const signUp = useCallback(
    (payload) => runAuthAction(() => signUpWithEmail(payload)),
    [runAuthAction]
  );

  const signIn = useCallback(
    (email, password) => runAuthAction(() => signInWithEmail(email, password)),
    [runAuthAction]
  );

  const signInGoogle = useCallback(
    () => runAuthAction(() => signInWithGoogle()),
    [runAuthAction]
  );

  const resetPassword = useCallback(
    async (email) => {
      setActionLoading(true);
      clearMessages();
      try {
        await sendPasswordReset(email);
        setSuccessMessage("Password reset email sent. Check your inbox.");
      } catch (err) {
        setError(getAuthErrorMessage(err));
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [clearMessages]
  );

  const logout = useCallback(async () => {
    setActionLoading(true);
    clearMessages();
    try {
      await logoutUser();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [clearMessages]);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      actionLoading,
      error,
      successMessage,
      clearMessages,
      signUp,
      signIn,
      signInGoogle,
      resetPassword,
      logout,
    }),
    [
      user,
      authLoading,
      actionLoading,
      error,
      successMessage,
      clearMessages,
      signUp,
      signIn,
      signInGoogle,
      resetPassword,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

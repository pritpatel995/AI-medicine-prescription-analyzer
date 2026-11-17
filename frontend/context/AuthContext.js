
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  fetchCurrentUser,
  loginUser,
  registerUser,
  setUnauthorizedHandler,
  tokenStorage,
} from "../services/api";

import { ensureNotificationPermission } from "../services/notifications";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Restore the user's session when the app starts.
  useEffect(() => {
    bootstrapFromStoredToken();
  }, []);

  // Handle unauthorized API responses.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStorage.clear();
      setUser(null);
      setSessionExpired(true);
    });
  }, []);

  async function bootstrapFromStoredToken() {
    try {
      const token = await tokenStorage.get();

      if (!token) {
        return;
      }

      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch (err) {
      await tokenStorage.clear();
      setUser(null);
    } finally {
      setIsBootstrapping(false);
    }
  }

  // Login existing user.
  async function login(email, password) {
    setAuthError(null);

    try {
      const result = await loginUser({ email, password });

      if (!result?.access_token) {
        throw new Error("Login succeeded without an access token.");
      }

      await tokenStorage.set(result.access_token);

      setUser(result.user ?? null);

      // Fetch the user profile if login does not return user details.
      if (!result.user) {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      }

      await ensureNotificationPermission();

      return true;
    } catch (err) {
      await tokenStorage.clear();
      setUser(null);
      setAuthError(err.message || "Login failed. Please try again.");
      return false;
    }
  }

  // Register a new user.
  async function register(name, email, password, extraFields = {}) {
    setAuthError(null);

    try {
      const result = await registerUser({
        name,
        email,
        password,
        ...extraFields,
      });

      if (!result?.access_token) {
        throw new Error(
          "Registration succeeded without an access token."
        );
      }

      await tokenStorage.set(result.access_token);

      setUser(result.user ?? null);

      if (!result.user) {
        const currentUser = await fetchCurrentUser();
        setUser(currentUser);
      }

      await ensureNotificationPermission();

      return true;
    } catch (err) {
      setAuthError(
        err.message || "Registration failed. Please try again."
      );
      return false;
    }
  }

  // Logout current user.
  async function logout() {
    await tokenStorage.clear();
    setUser(null);
    setAuthError(null);
    setSessionExpired(false);
  }

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated: !!user,
      isBootstrapping,
      authError,
      sessionExpired,

      clearSessionExpired: () => setSessionExpired(false),

      login,
      register,
      logout,
    }),
    [user, isBootstrapping, authError, sessionExpired]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return ctx;
}


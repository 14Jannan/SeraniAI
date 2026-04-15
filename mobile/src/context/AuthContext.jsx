import React, { createContext, useState, useEffect, useCallback } from "react";
import authApi from "../api/authApi";
import { tokenStorage, userStorage } from "../utils/tokenStorage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useState({
    isLoading: true,
    isSignedIn: false,
    user: null,
    accessToken: null,
  });

  const [error, setError] = useState(null);

  // Restore token on app launch
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await tokenStorage.getAccessToken();
        const cachedUser = await userStorage.getUser();

        if (token && cachedUser) {
          dispatch({
            isLoading: false,
            isSignedIn: true,
            user: cachedUser,
            accessToken: token,
          });
        } else {
          dispatch({
            isLoading: false,
            isSignedIn: false,
            user: null,
            accessToken: null,
          });
        }
      } catch (e) {
        console.error("Error restoring token:", e);
        dispatch({
          isLoading: false,
          isSignedIn: false,
          user: null,
          accessToken: null,
        });
      }
    };

    bootstrapAsync();
  }, []);

  const authContext = {
    isLoading: state.isLoading,
    isSignedIn: state.isSignedIn,
    user: state.user,
    accessToken: state.accessToken,
    error,
    clearError: () => setError(null),

    // Register user
    register: useCallback(async (email, password) => {
      try {
        setError(null);
        const response = await authApi.register(email, password);
        return response; // Return response so screen can navigate to OTP
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "Registration failed";
        setError(errorMessage);
        throw err;
      }
    }, []),

    // Verify OTP
    verifyOTP: useCallback(async (email, otp) => {
      try {
        setError(null);
        const response = await authApi.verifyOTP(email, otp);
        const accessToken = response.accessToken || response.token || null;
        const refreshToken = response.refreshToken || null;
        // Optionally auto-login after OTP verification
        if (accessToken && response.user) {
          await tokenStorage.saveToken(accessToken, refreshToken);
          await userStorage.saveUser(response.user);
          dispatch({
            isLoading: false,
            isSignedIn: true,
            user: response.user,
            accessToken,
          });
        }
        return response;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "OTP verification failed";
        setError(errorMessage);
        throw err;
      }
    }, []),

    // Login user
    login: useCallback(async (email, password) => {
      try {
        setError(null);
        const response = await authApi.login(email, password);
        const accessToken = response.accessToken || response.token || null;
        const refreshToken = response.refreshToken || null;
        const { user } = response;

        if (!accessToken || !user) {
          throw new Error("Login response was missing token or user data");
        }

        // Save tokens
        await tokenStorage.saveToken(
          accessToken,
          refreshToken,
          response.expiresIn || 900,
        );

        // Save user data
        await userStorage.saveUser(user);

        // Update state
        dispatch({
          isLoading: false,
          isSignedIn: true,
          user,
          accessToken,
        });

        return response;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "Login failed";
        setError(errorMessage);
        throw err;
      }
    }, []),

    // Logout user
    logout: useCallback(async () => {
      try {
        setError(null);
        await authApi.logout();
      } catch (err) {
        console.error("Logout error:", err);
      } finally {
        // Clear tokens and user regardless of API response
        await tokenStorage.clearTokens();
        await userStorage.clearUser();
        dispatch({
          isLoading: false,
          isSignedIn: false,
          user: null,
          accessToken: null,
        });
      }
    }, []),

    // Forgot password
    forgotPassword: useCallback(async (email) => {
      try {
        setError(null);
        const response = await authApi.forgotPassword(email);
        return response;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "Failed to send OTP";
        setError(errorMessage);
        throw err;
      }
    }, []),

    // Reset password
    resetPassword: useCallback(async (email, otp, newPassword) => {
      try {
        setError(null);
        const response = await authApi.resetPassword(email, otp, newPassword);
        return response;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "Password reset failed";
        setError(errorMessage);
        throw err;
      }
    }, []),

    // OAuth login
    oauthLogin: useCallback(async (provider, code) => {
      try {
        setError(null);
        const response = await authApi.oauthLogin(provider, code);
        const accessToken = response.accessToken || response.token || null;
        const refreshToken = response.refreshToken || null;
        const { user } = response;

        if (!accessToken || !user) {
          throw new Error(
            "OAuth login response was missing token or user data",
          );
        }

        // Save tokens
        await tokenStorage.saveToken(
          accessToken,
          refreshToken,
          response.expiresIn || 900,
        );

        // Save user data
        await userStorage.saveUser(user);

        // Update state
        dispatch({
          isLoading: false,
          isSignedIn: true,
          user,
          accessToken,
        });

        return response;
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "OAuth login failed";
        setError(errorMessage);
        throw err;
      }
    }, []),
  };

  return (
    <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

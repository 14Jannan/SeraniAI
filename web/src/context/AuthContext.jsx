import { createContext, useState, useContext, useEffect } from "react";
import { login as loginApi } from "../api/authApi";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Initialize logic: Check if token exists AND is not "null" or "undefined"
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token");
    return savedToken && savedToken !== "undefined" && savedToken !== "null"
      ? savedToken
      : null;
  });

  // 2. Persist token state
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const data = await loginApi({ email, password });

      const newToken = data.token;
      setToken(newToken); // This triggers the useEffect above
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    setToken(null); // This triggers the useEffect to remove item
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

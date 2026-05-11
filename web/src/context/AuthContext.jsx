import { createContext, useState, useContext, useEffect } from "react";
import { login as loginApi } from "../api/authApi";
import {
  clearAuthSession,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from "../utils/authStorage";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const login = async (email, password, rememberMe = false) => {
    try {
      const data = await loginApi({ email, password });

      const newToken = data.token;
      saveAuthSession({
        token: newToken,
        user: data.user,
        rememberMe,
      });
      setToken(newToken);
      setUser(data.user || null);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    clearAuthSession();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

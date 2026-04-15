import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Initialize logic: Check if token exists AND is not "null" or "undefined"
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token");
    return (savedToken && savedToken !== "undefined" && savedToken !== "null") ? savedToken : null;
  });

  // 2. Sync Axios headers whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post("http://localhost:7001/api/auth/login", {
        email,
        password,
      });
      
      const newToken = res.data.token;
      setToken(newToken); // This triggers the useEffect above
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || "Login failed" };
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
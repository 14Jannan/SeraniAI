import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const TOKEN_EXPIRY_KEY = "tokenExpiry";

// 🔥 memory cache (FAST PATH)
const _mem = {
  accessToken: null,
  refreshToken: null,
  expiry: null,
};

const storage = {
  async setItem(key, value) {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },

  async getItem(key) {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async removeItem(key) {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const tokenStorage = {
  // Save tokens
  async saveToken(accessToken, refreshToken, expiresIn = 900) {
    try {
      await storage.setItem(TOKEN_KEY, accessToken);

      if (refreshToken) {
        await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await storage.removeItem(REFRESH_TOKEN_KEY);
      }

      const expiryTime = Date.now() + expiresIn * 1000;

      await AsyncStorage.setItem(
        TOKEN_EXPIRY_KEY,
        expiryTime.toString()
      );

      // 🔥 MEMORY CACHE UPDATE
      _mem.accessToken = accessToken;
      _mem.refreshToken = refreshToken || null;
      _mem.expiry = expiryTime;

      return true;
    } catch (error) {
      console.error("Error saving tokens:", error);
      return false;
    }
  },

  // Get access token (with FAST memory check)
  async getAccessToken() {
    try {
      // 🔥 FAST PATH (no async storage)
      if (_mem.accessToken) {
        if (_mem.expiry && Date.now() >= _mem.expiry) {
          _mem.accessToken = null;
          _mem.expiry = null;
        } else {
          return _mem.accessToken;
        }
      }

      // fallback to storage
      const token = await storage.getItem(TOKEN_KEY);
      if (!token) return null;

      const expiryTime = await AsyncStorage.getItem(TOKEN_EXPIRY_KEY);

      if (expiryTime && Date.now() > parseInt(expiryTime)) {
        await this.clearTokens();
        return null;
      }

      // refill cache
      _mem.accessToken = token;
      _mem.expiry = expiryTime ? parseInt(expiryTime) : null;

      return token;
    } catch (error) {
      console.error("Error getting access token:", error);
      return null;
    }
  },

  async getRefreshToken() {
    try {
      if (_mem.refreshToken) return _mem.refreshToken;

      const token = await storage.getItem(REFRESH_TOKEN_KEY);
      _mem.refreshToken = token;
      return token;
    } catch (error) {
      console.error("Error getting refresh token:", error);
      return null;
    }
  },

  async clearTokens() {
    try {
      await storage.removeItem(TOKEN_KEY);
      await storage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(TOKEN_EXPIRY_KEY);

      // 🔥 CLEAR MEMORY CACHE
      _mem.accessToken = null;
      _mem.refreshToken = null;
      _mem.expiry = null;

      return true;
    } catch (error) {
      console.error("Error clearing tokens:", error);
      return false;
    }
  },

  async hasToken() {
    try {
      if (_mem.accessToken && _mem.expiry && Date.now() < _mem.expiry) {
        return true;
      }

      const token = await storage.getItem(TOKEN_KEY);
      return token !== null;
    } catch (error) {
      return false;
    }
  },
};

export const userStorage = {
  async saveUser(userData) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error("Error saving user:", error);
      return false;
    }
  },

  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  },

  async clearUser() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      return true;
    } catch (error) {
      console.error("Error clearing user:", error);
      return false;
    }
  },
};
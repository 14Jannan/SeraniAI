import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "serani-theme-mode";

const palette = {
  light: {
    mode: "light",
    background: "#EEF2FF",
    backgroundAlt: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceAlt: "#F8FAFC",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E2E8F0",
    primary: "#2563EB",
    primaryStrong: "#0F172A",
    primaryText: "#FFFFFF",
    accent: "#22C55E",
    accentAlt: "#7C3AED",
    heroStart: "#E0E7FF",
    heroEnd: "#FFFFFF",
    shadow: "#0F172A",
    chipBg: "#DBEAFE",
    chipText: "#1D4ED8",
    inputBg: "#F8FAFC",
    warningBg: "#FFFBEB",
    warningBorder: "#FDE68A",
  },
  dark: {
    mode: "dark",
    background: "#0B1120",
    backgroundAlt: "#111827",
    surface: "#111827",
    surfaceAlt: "#172033",
    text: "#F8FAFC",
    muted: "#94A3B8",
    border: "#243047",
    primary: "#60A5FA",
    primaryStrong: "#E2E8F0",
    primaryText: "#0F172A",
    accent: "#4ADE80",
    accentAlt: "#A78BFA",
    heroStart: "#111827",
    heroEnd: "#0B1120",
    shadow: "#000000",
    chipBg: "#1D4ED8",
    chipText: "#DBEAFE",
    inputBg: "#0F172A",
    warningBg: "#1E293B",
    warningBorder: "#475569",
  },
};

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode === "light" || savedMode === "dark") {
          setMode(savedMode);
        }
      } catch (error) {
        console.error("Failed to load theme mode:", error);
      } finally {
        setIsReady(true);
      }
    };

    loadTheme();
  }, []);

  const setThemeMode = useCallback(
    async (nextMode) => {
      const resolvedMode =
        nextMode === "dark" || nextMode === "light"
          ? nextMode
          : mode === "light"
            ? "dark"
            : "light";

      setMode(resolvedMode);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, resolvedMode);
      } catch (error) {
        console.error("Failed to save theme mode:", error);
      }
    },
    [mode],
  );

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      colors: palette[mode],
      setThemeMode,
      toggleTheme: setThemeMode,
      isReady,
    }),
    [mode, setThemeMode, isReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

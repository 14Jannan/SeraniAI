import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export const LandingScreen = ({ navigation }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 0
  );
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Top right theme toggle */}
      <View style={[styles.topHeader, { paddingTop: topInset + 12 }]}>
        <TouchableOpacity
          onPress={() => toggleTheme(mode === "light" ? "dark" : "light")}
          style={[
            styles.themeButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
          activeOpacity={0.7}
        >
          <Feather
            name={mode === "light" ? "moon" : "sun"}
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Center content */}
      <View style={styles.contentContainer}>
        {/* Robot mascot with background glow circle */}
        <View style={styles.robotWrapper}>
          <View
            style={[
              styles.heroGlow,
              {
                backgroundColor:
                  mode === "light" ? "#DBEAFE" : "rgba(59, 130, 246, 0.15)",
              },
            ]}
          />
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
            }}
            resizeMode="contain"
            style={[
              styles.robotImage,
              {
                width: Math.min(width * 0.44, 176),
                height: Math.min(width * 0.44, 176),
              },
            ]}
          />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>SeraniAI</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Your Smart AI Companion for productivity, learning, and journaling.
        </Text>
      </View>

      {/* Bottom Action Buttons */}
      <View style={[styles.footer, { paddingBottom: bottomInset + 16 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>
            Get Started
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={[
            styles.secondaryButton,
            {
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Log In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  topHeader: {
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 10,
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  robotWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  heroGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.6,
  },
  robotImage: {
    zIndex: 1,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 24,
    gap: 14,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
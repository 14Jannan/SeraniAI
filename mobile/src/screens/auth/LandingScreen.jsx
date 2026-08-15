import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export const LandingScreen = ({ navigation }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top right theme toggle */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => toggleTheme(mode === "light" ? "dark" : "light")}
          style={[styles.themeButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
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
        {/* Decorative background glow */}
        <View style={[styles.heroGlow, { backgroundColor: colors.heroStart }]} />
        
        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png" }}
          resizeMode="contain"
          style={styles.robotImage}
        />
        
        <Text style={[styles.title, { color: colors.text }]}>SeraniAI</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Your Smart AI Companion for productivity, learning, and journaling.
        </Text>
      </View>

      {/* Bottom Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Register")}
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Login")}
          style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Log In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'flex-end',
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -40, // slight nudge up to visually center, accounting for footer
  },
  heroGlow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    opacity: 0.5,
    top: "10%",
  },
  robotImage: {
    width: 200,
    height: 200,
    marginBottom: 32,
    zIndex: 1,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 16,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
});
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export const DashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              Welcome, {user?.name || "User"}!
            </Text>
            <Text style={[styles.email, { color: colors.muted }]}>
              {user?.email}
            </Text>
            <Text
              style={[
                styles.role,
                { backgroundColor: colors.chipBg, color: colors.chipText },
              ]}
            >
              Role: {user?.role || "user"}
            </Text>
          </View>
          <View style={{ alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={() => toggleTheme(mode === "light" ? "dark" : "light")}
              style={[
                styles.themeButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather
                name={mode === "light" ? "moon" : "sun"}
                size={16}
                color={colors.primary}
              />
            </TouchableOpacity>
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
              }}
              style={styles.robot}
            />
          </View>
        </View>
      </View>

      <View style={[styles.content, { paddingHorizontal: isWide ? 28 : 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>

        {[
          {
            label: "My Courses",
            description: "Continue learning",
            icon: <Feather name="book-open" size={20} color={colors.primary} />,
            onPress: () => navigation.navigate("Courses"),
          },
          {
            label: "Journal",
            description: "Track your progress",
            icon: <Feather name="edit-3" size={20} color={colors.accentAlt} />,
            onPress: () => navigation.navigate("Journal"),
          },
          {
            label: "AI Chatbot",
            description: "Ask questions anytime",
            icon: (
              <MaterialCommunityIcons
                name="robot-outline"
                size={22}
                color={colors.accent}
              />
            ),
            onPress: () => navigation.navigate("AIChatbot"),
          },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            onPress={item.onPress}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: colors.inputBg }]}
            >
              {item.icon}
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                {item.description}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </TouchableOpacity>
        ))}

        {user?.role === "admin" && (
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: colors.warningBg,
                borderColor: colors.warningBorder,
              },
            ]}
            onPress={() => navigation.navigate("AdminDashboard")}
          >
            <View
              style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}
            >
              <Feather name="shield" size={20} color="#D97706" />
            </View>
            <View style={styles.cardTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Admin Panel
              </Text>
              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                Manage app content
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: "#DC2626" }]}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  scrollView: { flex: 1 },
  hero: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  robot: { width: 72, height: 72 },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  greeting: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  email: { fontSize: 14, marginBottom: 10 },
  role: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  content: { paddingTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 14 },
  card: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    boxShadow: "0px 6px 12px rgba(15, 23, 42, 0.08)",
    elevation: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  cardDescription: { fontSize: 13 },
  logoutButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  logoutButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});

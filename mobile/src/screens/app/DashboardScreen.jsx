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
  const { user } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: 24 },
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
                {
                  backgroundColor: mode === "dark" ? "#FFFFFF" : colors.surface,
                  borderColor: colors.border,
                },
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
            label: "Subscription",
            description: "Review plan and billing",
            icon: <Feather name="credit-card" size={20} color={colors.accent} />,
            onPress: () => navigation.navigate("Subscription"),
          },
          {
            label: "Daily Tasks",
            description: "Manage your task progress",
            icon: (
              <Feather name="check-square" size={20} color={colors.accentAlt} />
            ),
            onPress: () => navigation.navigate("Tasks"),
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
            onPress: () => navigation.navigate('AIChatbot'),
          },
          {
            label: "Journal",
            description: "Write your thoughts & reflections",
            icon: <Feather name="edit-3" size={20} color="#A78BFA" />,
            onPress: () => navigation.navigate('Journal'),
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

      </View>

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
  content: { paddingTop: 20, paddingBottom: 8 },
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
});

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { isPaidRole } from "../../utils/roles";

export const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isPaidUser = isPaidRole(user?.role);

  const handleLockedAction = (label) => {
    Alert.alert(
      "Pro feature",
      `${label} is available on the Pro plan. Upgrade to unlock it.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
      ],
    );
  };
  const isWide = width >= 768;

  const getRoleBadgeLabel = (role) => {
    if (!role) return "FREE USER";
    if (role === "(Pro)PlanUser") return "PREMIUM USER";
    if (role === "enterpriseAdmin") return "ENTERPRISE ADMIN";
    if (role === "admin") return "SYSTEM ADMIN";
    return role.toUpperCase();
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 20) },
      ]}
    >
      <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
        <View style={styles.heroRow}>
          {/* Left: Avatar with Professional Border */}
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
            style={styles.avatarWrap}
          >
            <View style={styles.avatarBorder}>
              {user?.avatar || user?.profilePicture ? (
                <Image
                  source={{ uri: user.avatar || user.profilePicture }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="user" size={24} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Center: Greeting & Role Badge */}
          <TouchableOpacity
            style={styles.greetingWrap}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            <Text style={styles.greeting} numberOfLines={1}>
              Welcome back, {user?.name || "User"}!
            </Text>
            {user?.email ? (
              <Text style={styles.email} numberOfLines={1}>
                {user?.email}
              </Text>
            ) : null}
            <View style={styles.pillBadge}>
              <Text style={styles.pillBadgeText}>
                {getRoleBadgeLabel(user?.role)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right: Theme Toggle & AI Assistant Icon */}
          <View style={styles.rightActions}>
            <TouchableOpacity
              onPress={() => toggleTheme(mode === "light" ? "dark" : "light")}
              style={[
                styles.themeButton,
                {
                  backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.9)",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                },
              ]}
              activeOpacity={0.8}
            >
              <Feather
                name={mode === "light" ? "moon" : "sun"}
                size={16}
                color={mode === "light" ? colors.primary : "#FACC15"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={
                isPaidUser
                  ? () => navigation.navigate("AIChatbot")
                  : () => handleLockedAction("AI Chatbot")
              }
              activeOpacity={0.8}
            >
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
                }}
                style={[styles.robot, !isPaidUser && { opacity: 0.5 }]}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.content, { paddingHorizontal: isWide ? 28 : 20 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>

        {[
          {
            label: "Journal",
            description: "Write your thoughts & reflections",
            icon: <Feather name="edit-3" size={20} color="#A78BFA" />,
            onPress: () => navigation.navigate('Journal'),
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
            locked: !isPaidUser,
          },
          {
            label: "My Courses",
            description: "Continue learning",
            icon: <Feather name="book-open" size={20} color={colors.primary} />,
            onPress: () => navigation.navigate("Courses"),
            locked: !isPaidUser,
          },
          {
            label: "Daily Tasks",
            description: "Manage your task progress",
            icon: (
              <Feather name="check-square" size={20} color={colors.accentAlt} />
            ),
            onPress: () => navigation.navigate("Tasks"),
            locked: !isPaidUser,
          },
          {
            label: "Subscription",
            description: "Review plan and billing",
            icon: <Feather name="credit-card" size={20} color={colors.accent} />,
            onPress: () => navigation.navigate("Subscription"),
          },
          ...(user?.role === "enterpriseAdmin"
            ? [
                {
                  label: "Enterprise Manager",
                  description: "Manage team members & seats",
                  icon: <Feather name="users" size={20} color={colors.primary} />,
                  onPress: () => navigation.navigate("Enterprise"),
                },
              ]
            : []),
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              item.locked && styles.cardLocked,
            ]}
            onPress={
              item.locked ? () => handleLockedAction(item.label) : item.onPress
            }
            activeOpacity={item.locked ? 1 : 0.7}
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
            {item.locked ? (
              <View style={[styles.lockBadge, { backgroundColor: colors.inputBg }]}>
                <Feather name="lock" size={14} color={colors.muted} />
              </View>
            ) : (
              <Feather name="chevron-right" size={18} color={colors.muted} />
            )}
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
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  avatarWrap: {
    marginRight: 2,
  },
  avatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.7)",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingWrap: {
    flex: 1,
    justifyContent: "center",
  },
  greeting: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.75)",
    marginBottom: 6,
  },
  pillBadge: {
    backgroundColor: "#0F172A",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pillBadgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  rightActions: {
    alignItems: "center",
    gap: 8,
  },
  themeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  robot: { width: 54, height: 54 },
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
  cardLocked: { opacity: 0.5 },
  lockBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});

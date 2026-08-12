import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export const AdminAccessScreen = () => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const roleLabel =
    user?.role === "admin"
      ? "System Administrator"
      : user?.role === "enterpriseAdmin"
      ? "Enterprise Administrator"
      : "Admin User";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Admin logout error:", err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Banner Accent */}
      <View style={[styles.headerDecoration, { backgroundColor: colors.primaryStrong }]} />

      <View style={styles.content}>
        {/* Shield Icon Badge */}
        <View style={[styles.iconContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: "#EEF2FF" }]}>
            <Feather name="monitor" size={44} color={colors.primary} />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.title, { color: colors.text }]}>
          Web Access Required
        </Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Admin tools and management consoles are optimized for desktop browsers.
        </Text>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.userRow}>
            <View style={[styles.userAvatar, { backgroundColor: colors.primary }]}>
              <Feather name="shield" size={18} color="#fff" />
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {user?.name || "Admin User"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.muted }]} numberOfLines={1}>
                {user?.email || ""}
              </Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: "#E0E7FF" }]}>
              <Text style={[styles.roleText, { color: "#3730A3" }]}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        {/* Web Features Info Box */}
        <View style={[styles.infoBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            Please log in via desktop browser to access:
          </Text>

          <View style={styles.featureItem}>
            <Feather name="check-circle" size={16} color={colors.primary} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              User & Permissions Management
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Feather name="check-circle" size={16} color={colors.primary} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Course Creation & Content Studio
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Feather name="check-circle" size={16} color={colors.primary} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: colors.text }]}>
              Enterprise Workspaces & Seat Management
            </Text>
          </View>
        </View>

        {/* Logout Action Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.85}
        >
          <Feather name="log-out" size={18} color="#fff" />
          <Text style={styles.logoutBtnTxt}>Log Out of Mobile App</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Logout</Text>
            <Text style={[styles.modalBody, { color: colors.muted }]}>
              Are you sure you want to log out of the mobile application?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
              >
                <Text style={[styles.cancelTxt, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmLogoutBtn, { opacity: isLoggingOut ? 0.6 : 1 }]}
                onPress={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmLogoutTxt}>Log Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerDecoration: {
    height: 140,
    width: "100%",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: "absolute",
    top: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    padding: 6,
    borderRadius: 50,
    borderWidth: 1,
    elevation: 4,
    marginBottom: 20,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  userCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    elevation: 2,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 13,
  },
  badgeRow: {
    marginTop: 12,
    flexDirection: "row",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  infoBox: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    gap: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 13,
    fontWeight: "500",
  },
  logoutBtn: {
    width: "100%",
    height: 52,
    backgroundColor: "#DC2626",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    elevation: 3,
  },
  logoutBtnTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  /* Modal */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtns: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTxt: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmLogoutBtn: {
    flex: 1,
    height: 46,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLogoutTxt: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});

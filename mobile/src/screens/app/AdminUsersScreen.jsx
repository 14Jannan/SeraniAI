import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import adminApi from "../../api/adminApi";
import { useTheme } from "../../context/ThemeContext";

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "enterpriseUser", label: "Enterprise User" },
  { value: "enterpriseAdmin", label: "Enterprise Admin" },
  { value: "(Pro)PlanUser", label: "Pro Plan User" },
];

const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const getRoleLabel = (role) => ROLE_LABELS[role] || role || "Unknown";

export const AdminUsersScreen = () => {
  const { colors } = useTheme();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });

  const cardShadow = useMemo(
    () => ({
      boxShadow:
        colors.mode === "dark"
          ? "0px 6px 12px rgba(2, 6, 23, 0.5)"
          : "0px 6px 12px rgba(15, 23, 42, 0.08)",
      elevation: 3,
    }),
    [colors.mode],
  );

  const fetchUsers = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await adminApi.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Failed to fetch users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAddModal = () => {
    setCurrentUser(null);
    setFormData({ name: "", email: "", password: "", role: "user" });
    setShowRoles(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setCurrentUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role === "enterprise" ? "enterpriseUser" : user.role || "user",
    });
    setShowRoles(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
    setSaving(false);
    setShowRoles(false);
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Validation", "Name is required.");
      return false;
    }

    if (!formData.email.trim()) {
      Alert.alert("Validation", "Email is required.");
      return false;
    }

    if (!currentUser && !formData.password) {
      Alert.alert("Validation", "Password is required for new users.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (saving || !validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (currentUser) {
        const payload = { ...formData };
        if (!payload.password) {
          delete payload.password;
        }
        await adminApi.updateUser(currentUser._id, payload);
      } else {
        await adminApi.addUser(formData);
      }

      closeModal();
      await fetchUsers();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Operation failed.");
      setSaving(false);
    }
  };

  const handleDelete = (userId) => {
    Alert.alert("Delete User", "Are you sure you want to delete this user?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setError("");
            await adminApi.deleteUser(userId);
            await fetchUsers();
          } catch (deleteError) {
            setError(
              deleteError.response?.data?.message || "Failed to delete user.",
            );
          }
        },
      },
    ]);
  };

  const renderUser = ({ item }) => (
    <View
      style={[
        styles.userCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        cardShadow,
      ]}
    >
      <View style={styles.userHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.userEmail, { color: colors.muted }]}>
            {item.email}
          </Text>
        </View>
        <Text
          style={[
            styles.roleChip,
            {
              backgroundColor: colors.chipBg,
              color: colors.chipText,
            },
          ]}
        >
          {getRoleLabel(item.role)}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.inputBg }]}
          onPress={() => openEditModal(item)}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.warningBg }]}
          onPress={() => handleDelete(item._id)}
        >
          <Feather name="trash-2" size={16} color="#DC2626" />
          <Text style={[styles.actionText, { color: "#DC2626" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.headerTitle}>Admin Users</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Manage user accounts and roles
        </Text>
      </View>

      <View style={styles.content}>
        {!!error && (
          <Text
            style={[
              styles.errorText,
              {
                backgroundColor: colors.warningBg,
                borderColor: colors.warningBorder,
                color: colors.text,
              },
            ]}
          >
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={openAddModal}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>

        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUser}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchUsers(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {loading ? "Loading users..." : "No users found."}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      </View>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {currentUser ? "Edit User" : "Add New User"}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Name
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={formData.name}
              onChangeText={(value) => handleChange("name", value)}
              placeholder="Enter name"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Email
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={formData.email}
              onChangeText={(value) => handleChange("email", value)}
              placeholder="Enter email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Password {currentUser ? "(optional)" : ""}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={formData.password}
              onChangeText={(value) => handleChange("password", value)}
              placeholder={
                currentUser
                  ? "Leave blank to keep current password"
                  : "Enter password"
              }
              secureTextEntry
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Role
            </Text>
            <TouchableOpacity
              style={[
                styles.roleSelector,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowRoles((prev) => !prev)}
            >
              <Text style={{ color: colors.text }}>
                {getRoleLabel(formData.role)}
              </Text>
              <Feather
                name={showRoles ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>

            {showRoles && (
              <View
                style={[
                  styles.roleList,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                  },
                ]}
              >
                {ROLE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.roleItem}
                    onPress={() => {
                      handleChange("role", option.value);
                      setShowRoles(false);
                    }}
                  >
                    <Text style={{ color: colors.text }}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.surfaceAlt },
                ]}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  {saving ? "Saving..." : "Save"}
                </Text>
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
  header: {
    paddingTop: 46,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  errorText: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    textAlign: "center",
    fontWeight: "600",
    fontSize: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 36,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  userCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "800",
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  actionText: {
    fontWeight: "700",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  roleSelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleList: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
    maxHeight: 170,
  },
  roleItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
});

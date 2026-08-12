import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import subscriptionApi from "../../api/subscriptionApi";

export const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  // Profile state
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const nameInputRef = useRef(null);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Enterprise web-only notice modal
  const [showEnterpriseNoticeModal, setShowEnterpriseNoticeModal] = useState(false);

  // Avatar animation
  const avatarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const subData = await subscriptionApi.getCurrentSubscription();
        setSubscription(subData?.data || subData || null);
      } catch (_) {}
      finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Sync from context
  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
    if (user?.profileImage) setProfileImage(user.profileImage);
  }, [user?.name, user?.profileImage]);

  const flashMsg = (msg, success) => {
    setSaveMsg(msg);
    setSaveSuccess(success);
    setTimeout(() => setSaveMsg(""), 3000);
  };

  /* ── Pick image from gallery ── */
  const handlePickImage = async () => {
    // Bounce animation
    Animated.sequence([
      Animated.spring(avatarScale, { toValue: 0.88, useNativeDriver: true, speed: 30 }),
      Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library to change your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
    }
  };

  /* ── Save name + image ── */
  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      flashMsg("Display name is required.", false);
      return;
    }
    setIsSaving(true);
    setIsEditingName(false);
    try {
      await updateUser({ name: trimmed, profileImage: profileImage || null });
      flashMsg("Profile updated!", true);
    } catch (_) {
      flashMsg("Failed to save. Please try again.", false);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Tap avatar → open picker + show name editor ── */
  const handleAvatarPress = () => {
    Alert.alert("Edit Profile", "What would you like to do?", [
      {
        text: "Change Photo",
        onPress: handlePickImage,
      },
      {
        text: "Edit Name",
        onPress: () => {
          setIsEditingName(true);
          setTimeout(() => nameInputRef.current?.focus(), 150);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError("");
    try {
      const authApi = require("../../api/authApi").default;
      await authApi.deleteCurrentUser?.();
      await logout();
    } catch (err) {
      setDeleteError(
        err?.response?.data?.message || "Unable to delete account. Please try again."
      );
      setIsDeletingAccount(false);
    }
  };

  const planLabel =
    subscription?.plan === "Personal"
      ? "Pro Plan"
      : subscription?.plan === "Business"
      ? "Business Plan"
      : subscription?.plan || "Free Plan";

  const historyEntries =
    subscription?.transactionHistory?.length > 0
      ? subscription.transactionHistory
      : subscription
      ? [
          {
            date: subscription.lastCharged || subscription.createdAt || new Date(),
            amount: subscription.amount || 0,
            status:
              subscription.payHereStatus === "ACTIVE" || subscription.status === "Active"
                ? "Paid"
                : subscription.status || "Pending",
            description: `${subscription.plan || "Subscription"} charge`,
          },
        ]
      : [];

  const initial = (displayName || user?.name || "U").charAt(0).toUpperCase();

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loaderText, { color: colors.muted }]}>Loading…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.scroll, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ════════ HERO ════════ */}
        <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>

          {/* Avatar — tap to open picker */}
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.85}>
            <Animated.View
              style={[styles.avatarWrap, { transform: [{ scale: avatarScale }] }]}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={[styles.avatarCircle, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                    {initial}
                  </Text>
                </View>
              )}
              {/* Camera badge */}
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={11} color="#fff" />
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Inline name editor */}
          <View style={styles.nameRow}>
            {isEditingName ? (
              <TextInput
                ref={nameInputRef}
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.nameInput}
                placeholderTextColor="rgba(255,255,255,0.5)"
                placeholder="Your name"
                returnKeyType="done"
                onSubmitEditing={handleSave}
                autoFocus
              />
            ) : (
              <TouchableOpacity onPress={() => { setIsEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 120); }}>
                <View style={styles.nameTapRow}>
                  <Text style={styles.heroName}>{displayName || user?.name || "User"}</Text>
                  <Feather name="edit-2" size={13} color="rgba(255,255,255,0.6)" style={{ marginLeft: 6, marginTop: 2 }} />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.heroEmail}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user?.role || "user"}</Text>
          </View>

          {/* Save button — shows when changes made */}
          {(isEditingName || profileImage !== (user?.profileImage || null)) && (
            <TouchableOpacity
              style={[styles.heroSaveBtn, { opacity: isSaving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather name="check" size={14} color={colors.primary} />
                  <Text style={[styles.heroSaveTxt, { color: colors.primary }]}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.hint, { color: colors.muted }]}>
          Tap avatar to change photo · Tap name to edit
        </Text>

        <View style={styles.body}>
          {/* Save/Error Banner */}
          {!!saveMsg && (
            <View style={[styles.banner, { backgroundColor: saveSuccess ? "#D1FAE5" : "#FEE2E2", borderColor: saveSuccess ? "#6EE7B7" : "#FCA5A5" }]}>
              <Feather name={saveSuccess ? "check-circle" : "alert-circle"} size={15} color={saveSuccess ? "#065F46" : "#991B1B"} />
              <Text style={[styles.bannerText, { color: saveSuccess ? "#065F46" : "#991B1B" }]}>{saveMsg}</Text>
            </View>
          )}

          {/* ── Appearance ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.secHdr}>
              <View style={[styles.secIcon, { backgroundColor: "#EFF6FF" }]}>
                <Feather name="sun" size={17} color="#2563EB" />
              </View>
              <Text style={[styles.secTitle, { color: colors.text }]}>Appearance</Text>
            </View>
            <Text style={[styles.label, { color: colors.muted }]}>Theme</Text>
            <View style={styles.themeRow}>
              {["light", "dark"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.themeBtn, { backgroundColor: mode === t ? colors.primary : colors.inputBg, borderColor: mode === t ? colors.primary : colors.border }]}
                  onPress={() => toggleTheme(t)}
                >
                  <Feather name={t === "light" ? "sun" : "moon"} size={14} color={mode === t ? "#fff" : colors.muted} />
                  <Text style={[styles.themeTxt, { color: mode === t ? "#fff" : colors.muted }]}>
                    {t === "light" ? "Light" : "Dark"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Enterprise Workspace (Enterprise Admin Feature) ── */}
          {user?.role === "enterpriseAdmin" && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.secHdr}>
                <View style={[styles.secIcon, { backgroundColor: "#EEF2FF" }]}>
                  <Feather name="users" size={17} color="#4F46E5" />
                </View>
                <Text style={[styles.secTitle, { color: colors.text }]}>Enterprise Workspace</Text>
              </View>
              <Text style={[styles.enterpriseDesc, { color: colors.muted }]}>
                Manage your organization workspace and corporate member seats.
              </Text>
              <TouchableOpacity
                style={[styles.enterpriseBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowEnterpriseNoticeModal(true)}
              >
                <Feather name="user-plus" size={16} color="#fff" />
                <Text style={styles.enterpriseBtnTxt}>Add Enterprise Users</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Billing ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.secHdr}>
              <View style={[styles.secIcon, { backgroundColor: "#F0FDF4" }]}>
                <Feather name="credit-card" size={17} color="#16A34A" />
              </View>
              <Text style={[styles.secTitle, { color: colors.text }]}>Billing</Text>
            </View>

            <View style={[styles.planRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planName, { color: colors.text }]}>{planLabel}</Text>
                <Text style={[styles.planSub, { color: colors.muted }]}>Intelligence for everyday tasks</Text>
              </View>
              <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate("Subscription")}>
                <Text style={styles.upgradeTxt}>Upgrade</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.subTitle, { color: colors.text }]}>Billing History</Text>
            <View style={[styles.historyBox, { borderColor: colors.border }]}>
              {historyEntries.length > 0 ? (
                historyEntries.map((tx, idx) => {
                  const amt = Number.isFinite(Number(tx.amount)) ? Number(tx.amount).toFixed(2) : String(tx.amount || "0.00");
                  const isPaid = tx.status === "Paid" || tx.status === "paid";
                  return (
                    <View key={idx} style={[styles.txRow, { borderBottomWidth: idx < historyEntries.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.txDate, { color: colors.text }]}>
                          {new Date(tx.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </Text>
                        <Text style={[styles.txDesc, { color: colors.muted }]}>{tx.description || "Subscription charge"}</Text>
                      </View>
                      <Text style={[styles.txAmt, { color: colors.text }]}>LKR {amt}</Text>
                      <View style={[styles.statusPill, { backgroundColor: isPaid ? "#D1FAE5" : colors.inputBg }]}>
                        <Text style={[styles.statusTxt, { color: isPaid ? "#065F46" : colors.muted }]}>{tx.status || "Paid"}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyTx, { color: colors.muted }]}>No billing history yet</Text>
              )}
            </View>
          </View>

          {/* ── Account ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.secTitle, { color: colors.text, marginBottom: 14 }]}>Account</Text>
            <View style={[styles.accountBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Name</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{displayName || user?.name || "Not set"}</Text>
              </View>
              <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.muted }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{user?.email || "Not set"}</Text>
              </View>
              <View style={styles.deleteRow}>
                <Text style={[styles.infoLabel, { color: "#DC2626" }]}>Delete account</Text>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowDeleteModal(true)}>
                  <Text style={styles.deleteBtnTxt}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* ── Danger Zone ── */}
          <View style={[styles.dangerCard, { backgroundColor: "#FFF1F2", borderColor: "#FCA5A5" }]}>
            <Text style={styles.dangerTitle}>Danger Zone</Text>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={16} color="#fff" />
              <Text style={styles.logoutTxt}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Delete Modal ── */}
        <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
          <View style={styles.overlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Account</Text>
              <Text style={[styles.modalBody, { color: colors.muted }]}>
                Are you sure you want to delete your account? This action cannot be undone.
              </Text>
              {!!deleteError && <Text style={styles.modalErr}>{deleteError}</Text>}
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.inputBg }]} onPress={() => { setShowDeleteModal(false); setDeleteError(""); }}>
                  <Text style={[styles.cancelTxt, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmDeleteBtn, { opacity: isDeletingAccount ? 0.6 : 1 }]} onPress={handleDeleteAccount} disabled={isDeletingAccount}>
                  <Text style={styles.confirmDeleteTxt}>{isDeletingAccount ? "Deleting…" : "Delete"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Logout Modal ── */}
        <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
          <View style={styles.overlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Confirm Logout</Text>
              <Text style={[styles.modalBody, { color: colors.muted }]}>
                Are you sure you want to log out of Serani AI?
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
                  style={[styles.confirmDeleteBtn, { backgroundColor: "#DC2626", opacity: isLoggingOut ? 0.6 : 1 }]}
                  onPress={confirmLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmDeleteTxt}>Logout</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── Enterprise Invite Web Only Modal ── */}
        <Modal
          visible={showEnterpriseNoticeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowEnterpriseNoticeModal(false)}
        >
          <View style={styles.overlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
              <View style={[styles.webNoticeIconCircle, { backgroundColor: "#EEF2FF" }]}>
                <Feather name="monitor" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text, textAlign: "center" }]}>
                Web Feature Only
              </Text>
              <Text style={[styles.modalBody, { color: colors.muted, textAlign: "center", marginTop: 6 }]}>
                Adding and inviting new enterprise users is only allowed on the web portal. Please log in via a desktop web browser to manage your team members and invite seats.
              </Text>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={() => setShowEnterpriseNoticeModal(false)}
              >
                <Text style={styles.confirmDeleteTxt}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loaderText: { fontSize: 14 },

  /* Hero */
  hero: { paddingTop: 52, paddingBottom: 32, alignItems: "center", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, gap: 6 },
  avatarWrap: { position: "relative", marginBottom: 4 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "#fff" },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", elevation: 6, borderWidth: 3, borderColor: "rgba(255,255,255,0.3)" },
  avatarLetter: { fontSize: 38, fontWeight: "bold" },
  cameraBadge: { position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  nameRow: { flexDirection: "row", alignItems: "center" },
  nameTapRow: { flexDirection: "row", alignItems: "center" },
  heroName: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  nameInput: { fontSize: 20, fontWeight: "bold", color: "#fff", borderBottomWidth: 2, borderBottomColor: "rgba(255,255,255,0.5)", paddingVertical: 2, paddingHorizontal: 8, minWidth: 140, textAlign: "center" },
  heroEmail: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
  rolePill: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)" },
  roleText: { fontSize: 12, color: "#fff", fontWeight: "600" },
  heroSaveBtn: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff" },
  heroSaveTxt: { fontWeight: "700", fontSize: 14 },

  hint: { textAlign: "center", fontSize: 12, marginTop: 10, marginBottom: 2, paddingHorizontal: 20 },
  body: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  /* Banner */
  banner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  bannerText: { fontSize: 13, fontWeight: "600", flex: 1 },

  /* Card */
  card: { borderRadius: 18, borderWidth: 1, padding: 18, elevation: 2 },
  secHdr: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  secIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  secTitle: { fontSize: 17, fontWeight: "bold" },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 8 },

  /* Theme */
  themeRow: { flexDirection: "row", gap: 10 },
  themeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  themeTxt: { fontSize: 13, fontWeight: "600" },

  /* Billing */
  planRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16, gap: 10 },
  planName: { fontSize: 15, fontWeight: "bold", marginBottom: 2 },
  planSub: { fontSize: 12 },
  upgradeBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  upgradeTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  subTitle: { fontSize: 14, fontWeight: "700", marginBottom: 10 },
  historyBox: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  txRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  txDate: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
  txDesc: { fontSize: 11 },
  txAmt: { fontSize: 13, fontWeight: "600", marginRight: 6 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusTxt: { fontSize: 11, fontWeight: "700" },
  emptyTx: { textAlign: "center", padding: 18, fontSize: 13 },

  /* Account */
  accountBox: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 14 },
  infoLabel: { fontSize: 13, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "600", flex: 1, textAlign: "right" },
  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12 },
  deleteBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#DC2626", borderRadius: 8 },
  deleteBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  /* Danger */
  dangerCard: { borderRadius: 18, borderWidth: 1, padding: 18 },
  dangerTitle: { fontSize: 17, fontWeight: "bold", color: "#DC2626", marginBottom: 14 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, backgroundColor: "#DC2626", borderRadius: 10 },
  logoutTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },

  /* Enterprise */
  enterpriseDesc: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  enterpriseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 10 },
  enterpriseBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  webNoticeIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },

  /* Modal */
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalBox: { width: "100%", borderRadius: 18, padding: 24, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalBody: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalErr: { color: "#DC2626", fontSize: 13, marginBottom: 12 },
  modalBtns: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9 },
  cancelTxt: { fontWeight: "600", fontSize: 14 },
  confirmDeleteBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: "#DC2626", borderRadius: 9 },
  confirmDeleteTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

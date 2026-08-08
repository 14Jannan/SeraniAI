import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getEnterpriseUsers,
  addUserToEnterprise,
  updateEnterpriseUser,
  deleteEnterpriseUser,
  revokeEnterpriseInvite,
} from "../../api/enterpriseAdminApi";
import { useTheme } from "../../context/ThemeContext";

/* ─── helpers ────────────────────────────────────────────────────────────── */

const formatDate = (value) => {
  if (!value) return "–";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "–" : d.toLocaleDateString();
};

const StatusBadge = ({ status, colors }) => {
  const config = {
    active: { bg: "#d1fae5", text: "#065f46" },
    deactivated: { bg: "#fee2e2", text: "#991b1b" },
    pending: { bg: "#fef9c3", text: "#854d0e" },
    expired: { bg: "#fee2e2", text: "#991b1b" },
    accepted: { bg: "#d1fae5", text: "#065f46" },
  };
  const c = config[status] ?? { bg: colors.border, text: colors.muted };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
};

/* ─── main component ─────────────────────────────────────────────────────── */

export const EnterpriseManagerScreen = () => {
  const { colors } = useTheme();

  /* data state */
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [seatSummary, setSeatSummary] = useState({
    seatLimit: 1,
    seatsUsed: 0,
    seatsRemaining: 1,
  });

  /* ui state */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  /* invite modal */
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  /* edit modal */
  const [editVisible, setEditVisible] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  /* card shadow */
  const cardShadow = useMemo(
    () => ({
      boxShadow:
        colors.mode === "dark"
          ? "0px 6px 16px rgba(2, 6, 23, 0.55)"
          : "0px 6px 16px rgba(15, 23, 42, 0.07)",
      elevation: 3,
    }),
    [colors.mode],
  );

  /* ── fetch ───────────────────────────────────────────────────────────── */

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getEnterpriseUsers();
      const data = res.data;
      setUsers(data?.users ?? []);
      setInvites(data?.invites ?? []);
      setSeatSummary({
        seatLimit: data?.seatLimit ?? 1,
        seatsUsed: data?.seatsUsed ?? 0,
        seatsRemaining: data?.seatsRemaining ?? 0,
      });
      setError("");
    } catch {
      setError("Failed to load enterprise data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* refresh on tab focus */
  useFocusEffect(
    useCallback(() => {
      fetchData(false);
    }, [fetchData]),
  );

  /* ── invite user ─────────────────────────────────────────────────────── */

  const handleOpenInvite = () => {
    if (seatSummary.seatsUsed >= seatSummary.seatLimit) {
      setError(
        `Seat limit reached. You have used ${seatSummary.seatsUsed} of ${seatSummary.seatLimit} seats.`,
      );
      return;
    }
    setError("");
    setNotice("");
    setInviteEmail("");
    setInviteVisible(true);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await addUserToEnterprise(inviteEmail.trim());
      setNotice(res.data?.message ?? "Invitation sent successfully.");
      setError("");
      setInviteVisible(false);
      fetchData(false);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to send invitation.");
      setNotice("");
    } finally {
      setInviting(false);
    }
  };

  /* ── edit user ───────────────────────────────────────────────────────── */

  const handleOpenEdit = (user) => {
    setEditTarget(user);
    setEditName(user.name ?? "");
    setEditEmail(user.email ?? "");
    setEditStatus(user.status ?? "active");
    setError("");
    setNotice("");
    setEditVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateEnterpriseUser(editTarget._id, {
        name: editName.trim(),
        email: editEmail.trim(),
        status: editStatus,
      });
      setEditVisible(false);
      setNotice("Member updated successfully.");
      setError("");
      fetchData(false);
    } catch (err) {
      setError(err.response?.data?.message ?? "Failed to update member.");
      setNotice("");
    } finally {
      setSaving(false);
    }
  };

  /* ── delete user ─────────────────────────────────────────────────────── */

  const handleDelete = (user) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${user.name ?? user.email} from the enterprise?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEnterpriseUser(user._id);
              setNotice("Member removed.");
              setError("");
              fetchData(false);
            } catch (err) {
              setError(err.response?.data?.message ?? "Failed to remove member.");
              setNotice("");
            }
          },
        },
      ],
    );
  };

  /* ── revoke invite ───────────────────────────────────────────────────── */

  const handleStopInvite = (invite) => {
    Alert.alert(
      "Stop Invite",
      `Revoke the invitation sent to ${invite.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Stop Invite",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await revokeEnterpriseInvite(invite.id);
              setNotice(res.data?.message ?? "Invite revoked.");
              setError("");
              fetchData(false);
            } catch (err) {
              setError(err.response?.data?.message ?? "Failed to revoke invite.");
              setNotice("");
            }
          },
        },
      ],
    );
  };

  /* ── filtered list ───────────────────────────────────────────────────── */

  const visibleInvites = useMemo(
    () => invites.filter((inv) => inv.status !== "accepted"),
    [invites],
  );

  /* ── render items ────────────────────────────────────────────────────── */

  const renderMemberItem = ({ item: user }) => (
    <View
      style={[
        styles.card,
        cardShadow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Avatar circle */}
      <View style={[styles.avatar, { backgroundColor: colors.primary + "22" }]}>
        <Text style={[styles.avatarText, { color: colors.primary }]}>
          {(user.name ?? user.email ?? "?")[0].toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {user.name ?? "–"}
        </Text>
        <Text style={[styles.cardEmail, { color: colors.muted }]} numberOfLines={1}>
          {user.email}
        </Text>
        <View style={styles.cardMeta}>
          <View style={[styles.typePill, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.typePillText, { color: colors.primary }]}>Member</Text>
          </View>
          <StatusBadge status={user.status ?? "active"} colors={colors} />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          onPress={() => handleOpenEdit(user)}
          style={[styles.iconBtn, { backgroundColor: colors.primary + "15" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="edit-2" size={16} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => !user.isOwner && handleDelete(user)}
          disabled={Boolean(user.isOwner)}
          style={[
            styles.iconBtn,
            {
              backgroundColor: user.isOwner ? colors.border + "40" : "#fee2e2",
              marginTop: 8,
            },
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather
            name="trash-2"
            size={16}
            color={user.isOwner ? colors.muted : "#dc2626"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInviteItem = ({ item: invite }) => (
    <View
      style={[
        styles.card,
        cardShadow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Icon */}
      <View style={[styles.avatar, { backgroundColor: "#fef9c3" }]}>
        <Feather name="mail" size={18} color="#854d0e" />
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {invite.email}
        </Text>
        <Text style={[styles.cardEmail, { color: colors.muted }]}>
          Invited: {formatDate(invite.invitedAt)}
          {invite.expiresAt ? `  ·  Exp: ${formatDate(invite.expiresAt)}` : ""}
        </Text>
        <View style={styles.cardMeta}>
          <View style={[styles.typePill, { backgroundColor: "#fef9c3" }]}>
            <Text style={[styles.typePillText, { color: "#854d0e" }]}>Invite</Text>
          </View>
          <StatusBadge status={invite.status} colors={colors} />
        </View>
      </View>

      {/* Stop Invite action */}
      {invite.status === "pending" && (
        <TouchableOpacity
          onPress={() => handleStopInvite(invite)}
          style={[styles.stopBtn, { borderColor: "#dc2626" }]}
        >
          <Text style={styles.stopBtnText}>Stop</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  /* combined list data */
  const listData = [
    { type: "header" },
    ...users.map((u) => ({ type: "member", data: u })),
    ...(visibleInvites.length > 0
      ? [
          { type: "sectionTitle", title: "Pending & Expired Invitations" },
          ...visibleInvites.map((inv) => ({ type: "invite", data: inv })),
        ]
      : []),
  ];

  /* ── styles helpers ──────────────────────────────────────────────────── */

  const s = useMemo(
    () => ({
      container: { flex: 1, backgroundColor: colors.background },
      headerCard: [
        styles.headerCard,
        cardShadow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ],
      headerTitle: [styles.headerTitle, { color: colors.text }],
      headerSub: [styles.headerSub, { color: colors.muted }],
      sectionLabel: [styles.sectionLabel, { color: colors.muted }],
      emptyText: [styles.emptyText, { color: colors.muted }],
    }),
    [colors, cardShadow],
  );

  /* ── render list item dispatcher ────────────────────────────────────── */

  const renderItem = ({ item }) => {
    if (item.type === "header") {
      return (
        <View style={s.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={s.headerTitle}>Enterprise Manager</Text>
              <Text style={s.headerSub}>
                Seats used:{" "}
                <Text style={{ fontWeight: "700", color: colors.primary }}>
                  {seatSummary.seatsUsed}
                </Text>{" "}
                / {seatSummary.seatLimit}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleOpenInvite}
              disabled={seatSummary.seatsUsed >= seatSummary.seatLimit}
              style={[
                styles.inviteBtn,
                {
                  backgroundColor:
                    seatSummary.seatsUsed >= seatSummary.seatLimit
                      ? colors.muted
                      : colors.primary,
                },
              ]}
            >
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.inviteBtnText}>Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Seat bar */}
          <View style={[styles.seatBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.seatFill,
                {
                  backgroundColor: colors.primary,
                  width: `${Math.min(
                    100,
                    (seatSummary.seatsUsed / seatSummary.seatLimit) * 100,
                  )}%`,
                },
              ]}
            />
          </View>

          {/* Alerts */}
          {error ? (
            <View style={styles.alertBox}>
              <Feather name="alert-circle" size={14} color="#dc2626" />
              <Text style={styles.alertText}>{error}</Text>
            </View>
          ) : null}
          {notice ? (
            <View style={[styles.alertBox, { backgroundColor: "#d1fae5" }]}>
              <Feather name="check-circle" size={14} color="#065f46" />
              <Text style={[styles.alertText, { color: "#065f46" }]}>{notice}</Text>
            </View>
          ) : null}

          <Text style={s.sectionLabel}>Members & Invite Status</Text>
        </View>
      );
    }

    if (item.type === "member") return renderMemberItem({ item: item.data });
    if (item.type === "invite") return renderInviteItem({ item: item.data });

    if (item.type === "sectionTitle") {
      return (
        <Text style={[s.sectionLabel, styles.sectionSpacer]}>{item.title}</Text>
      );
    }

    return null;
  };

  /* ── main render ─────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>
          Loading enterprise data…
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={listData}
        keyExtractor={(item, idx) =>
          item.type === "member"
            ? `member-${item.data._id}`
            : item.type === "invite"
              ? `invite-${item.data.id}`
              : `${item.type}-${idx}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Text style={s.emptyText}>No members or invites found.</Text>
        }
      />

      {/* ── Invite Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={inviteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInviteVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Invite User
              </Text>
              <TouchableOpacity onPress={() => setInviteVisible(false)}>
                <Feather name="x" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              User Email
            </Text>
            <TextInput
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Enter registered user email"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setInviteVisible(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendInvite}
                disabled={inviting || !inviteEmail.trim()}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: inviting ? 0.7 : 1 },
                ]}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={editVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Member
              </Text>
              <TouchableOpacity onPress={() => setEditVisible(false)}>
                <Feather name="x" size={22} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Full name"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />

            {/* Email */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Email</Text>
            <TextInput
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />

            {/* Status picker (toggle buttons) */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Status</Text>
            <View style={styles.statusRow}>
              {["active", "deactivated"].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setEditStatus(s)}
                  style={[
                    styles.statusOption,
                    {
                      backgroundColor:
                        editStatus === s ? colors.primary : colors.background,
                      borderColor:
                        editStatus === s ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      { color: editStatus === s ? "#fff" : colors.muted },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.muted }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={saving}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

/* ─── stylesheet ─────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },

  /* header card */
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  inviteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* seat bar */
  seatBar: {
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  seatFill: {
    height: 6,
    borderRadius: 4,
  },

  /* alerts */
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: "#991b1b",
  },

  /* section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 4,
  },
  sectionSpacer: {
    marginTop: 16,
    marginBottom: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },

  /* member / invite card */
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontWeight: "800",
    fontSize: 18,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardEmail: {
    fontSize: 12,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  typePill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  /* card action buttons */
  cardActions: {
    alignItems: "center",
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  /* stop invite */
  stopBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  stopBtnText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "700",
  },

  /* modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    gap: 6,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },

  /* status toggle */
  statusRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* modal actions */
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  cancelBtnText: {
    fontWeight: "700",
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});

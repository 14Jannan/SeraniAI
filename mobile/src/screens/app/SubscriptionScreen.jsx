import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import subscriptionApi from "../../api/subscriptionApi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const PLANS = [
  {
    id: "pro",
    title: "Pro",
    price: "LKR 4,000",
    description: "Best for personal growth and deeper AI usage.",
    accent: "#2563EB",
    icon: "zap",
  },
  {
    id: "business",
    title: "Business",
    price: "LKR 3,000 / seat",
    description: "Built for teams, roles, and centralized billing.",
    accent: "#0F766E",
    icon: "briefcase",
  },
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

export const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyPlanId, setBusyPlanId] = useState(null);
  const [businessSeats, setBusinessSeats] = useState("5");

  const cardShadow = useMemo(
    () => ({
      boxShadow:
        colors.mode === "dark"
          ? "0px 10px 24px rgba(2, 6, 23, 0.45)"
          : "0px 10px 24px rgba(15, 23, 42, 0.08)",
      elevation: 3,
    }),
    [colors.mode],
  );

  const fetchSubscription = useCallback(async (isRefresh = false) => {
    try {
      setError("");
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await subscriptionApi.getCurrentSubscription();
      setSubscription(data || null);
    } catch (fetchError) {
      if (fetchError.response?.status === 404) {
        setSubscription(null);
      } else {
        setError(
          fetchError.response?.data?.message || "Failed to load subscription.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, [fetchSubscription]),
  );

  const handleRefresh = async () => {
    await fetchSubscription(true);
    await refreshUser?.();
  };

  const handleCheckout = (plan) => {
    navigation.navigate("SubscriptionCheckout", {
      planId: plan.id,
      seats: plan.id === "business" ? Math.max(5, Number(businessSeats) || 5) : 1,
    });
  };

  const handleCancelSubscription = async () => {
    if (!subscription?._id) return;

    Alert.alert(
      "Cancel subscription",
      "This will cancel the active plan for this account.",
      [
        { text: "Keep plan", style: "cancel" },
        {
          text: "Cancel now",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyPlanId("cancel");
              await subscriptionApi.cancelSubscription(subscription._id);
              await refreshUser?.();
              await fetchSubscription(true);
              Alert.alert(
                "Subscription cancelled",
                "Your plan is now inactive.",
              );
            } catch (cancelError) {
              setError(
                cancelError.response?.data?.message ||
                  cancelError.message ||
                  "Unable to cancel subscription.",
              );
            } finally {
              setBusyPlanId(null);
            }
          },
        },
      ],
    );
  };

  const handleCancelEnterprisePremium = () => {
    Alert.alert(
      "Cancel Enterprise Premium Access",
      "Are you sure you want to cancel enterprise premium access? You will be moved to the Free plan immediately.",
      [
        { text: "Keep access", style: "cancel" },
        {
          text: "Cancel now",
          style: "destructive",
          onPress: async () => {
            try {
              setBusyPlanId("cancelEnterprise");
              await subscriptionApi.cancelEnterprisePremiumAccess();
              await refreshUser?.();
              await fetchSubscription(true);
              Alert.alert(
                "Enterprise access cancelled",
                "Your account has been moved to the Free plan.",
              );
            } catch (cancelError) {
              setError(
                cancelError.response?.data?.message ||
                  cancelError.message ||
                  "Unable to cancel enterprise premium access.",
              );
            } finally {
              setBusyPlanId(null);
            }
          },
        },
      ],
    );
  };

  const handleRetrySubscription = async () => {
    if (!subscription?._id) return;

    try {
      setBusyPlanId("retry");
      await subscriptionApi.retrySubscription(subscription._id);
      await fetchSubscription(true);
      Alert.alert("Retry sent", "We triggered a retry for the subscription.");
    } catch (retryError) {
      setError(
        retryError.response?.data?.message ||
          retryError.message ||
          "Unable to retry subscription.",
      );
    } finally {
      setBusyPlanId(null);
    }
  };

  const activePlanCode = subscription?.planCode || null;

  /* Determine whether the user must cancel before they can pick a new plan */
  const isEnterpriseUser = user?.role === "enterpriseUser";
  const isProPlanUser = user?.role === "(Pro)PlanUser";
  const isEnterpriseAdmin = user?.role === "enterpriseAdmin";
  const hasActiveSubscription = subscription?.status === "Active";

  /* Block upgrade when: enterprise user (managed access), or already has an active subscription */
  const mustCancelBeforeUpgrade =
    isEnterpriseUser || isProPlanUser || isEnterpriseAdmin || hasActiveSubscription;

  const upgradeBlockMessage = isEnterpriseUser
    ? "Your premium access is managed by your enterprise. Cancel your enterprise premium access first before choosing another plan."
    : isProPlanUser || isEnterpriseAdmin
    ? "You already have an active plan. Cancel your current subscription before upgrading to another plan."
    : "You already have an active subscription. Cancel your current plan first before upgrading to another plan.";

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.title}>Subscription</Text>
        <Text style={styles.subtitle}>
          Manage your plan, billing, and payment status.
        </Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
            <Feather name="user" size={14} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {user?.name || "Account"}
            </Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: colors.surface }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.text }]}>
              {user?.role || "user"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}

      {error ? (
        <View style={[styles.alert, { borderColor: colors.warningBorder }]}>
          <Feather name="alert-triangle" size={16} color="#B45309" />
          <Text style={styles.alertText}>{error}</Text>
        </View>
      ) : null}

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          cardShadow,
        ]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>Current plan</Text>
        {subscription ? (
          <View style={styles.summaryBlock}>
            <Text style={[styles.planName, { color: colors.text }]}>
              {subscription.plan || "Plan"}
            </Text>
            <Text style={[styles.summaryLine, { color: colors.muted }]}>Status: {subscription.status || "Unknown"}</Text>
            <Text style={[styles.summaryLine, { color: colors.muted }]}>Seats: {subscription.seats || 1}</Text>
            <Text style={[styles.summaryLine, { color: colors.muted }]}>Billing cycle: {subscription.billingCycle || "Monthly"}</Text>
            <Text style={[styles.summaryLine, { color: colors.muted }]}>Expires: {formatDate(subscription.endDate)}</Text>
          </View>
        ) : (
          <View style={styles.summaryBlock}>
            <Text style={[styles.planName, { color: colors.text }]}>Free</Text>
            <Text style={[styles.summaryLine, { color: colors.muted }]}>You do not have an active subscription yet.</Text>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Upgrade options</Text>

      {/* Block banner — shown when user must cancel before selecting a new plan */}
      {mustCancelBeforeUpgrade ? (
        <View style={[styles.blockBanner, { backgroundColor: colors.surface, borderColor: "#F59E0B" }]}>
          <Feather name="lock" size={16} color="#B45309" />
          <Text style={styles.blockBannerText}>{upgradeBlockMessage}</Text>
        </View>
      ) : null}

      {/* Enterprise user — cancel managed access */}
      {isEnterpriseUser ? (
        <TouchableOpacity
          style={[styles.dangerButton, { backgroundColor: "#DC2626" }]}
          onPress={handleCancelEnterprisePremium}
          disabled={busyPlanId === "cancelEnterprise"}
        >
          {busyPlanId === "cancelEnterprise" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.dangerButtonText}>Cancel Enterprise Access</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {PLANS.map((plan) => {
        const isCurrent = activePlanCode === plan.id;
        const isBusy = busyPlanId === plan.id;
        /* A plan button is disabled if user must cancel first OR if this is their current plan */
        const isDisabled = isBusy || isCurrent || mustCancelBeforeUpgrade;
        const buttonLabel = isCurrent
          ? "Already active"
          : mustCancelBeforeUpgrade
          ? "Cancel current plan first"
          : `Upgrade to ${plan.title}`;

        return (
          <View
            key={plan.id}
            style={[
              styles.planCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              cardShadow,
            ]}
          >
            <View style={styles.planHeader}>
              <View style={[styles.planIcon, { backgroundColor: plan.accent }]}>
                <Feather name={plan.icon} size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
                <Text style={[styles.planPrice, { color: colors.muted }]}>{plan.price}</Text>
              </View>
              {isCurrent ? (
                <View style={[styles.currentBadge, { backgroundColor: colors.chipBg }]}>
                  <Text style={[styles.currentBadgeText, { color: colors.chipText }]}>Current</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.planDescription, { color: colors.muted }]}>{plan.description}</Text>

            {plan.id === "business" && !mustCancelBeforeUpgrade ? (
              <View style={styles.seatRow}>
                <Text style={[styles.seatLabel, { color: colors.text }]}>Seats</Text>
                <TextInput
                  value={businessSeats}
                  onChangeText={setBusinessSeats}
                  keyboardType="number-pad"
                  style={[
                    styles.seatInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="5"
                  placeholderTextColor={colors.muted}
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: isDisabled ? colors.border : plan.accent },
              ]}
              onPress={() => !isDisabled && handleCheckout(plan)}
              disabled={isDisabled}
            >
              {isBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}

      {subscription ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={handleRetrySubscription}
            disabled={busyPlanId === "retry"}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Retry payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dangerButton, { backgroundColor: "#DC2626" }]}
            onPress={handleCancelSubscription}
            disabled={busyPlanId === "cancel"}
          >
            <Text style={styles.dangerButtonText}>Cancel plan</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.footerNote}>
        Tap a plan to open the checkout page, then complete payment in PayHere.
      </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: {
    paddingBottom: 28,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaText: { fontSize: 12, fontWeight: "700" },
  loadingWrap: { paddingVertical: 16 },
  alert: {
    borderWidth: 1,
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  alertText: { color: "#92400E", flex: 1, fontSize: 13 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  summaryBlock: { gap: 6 },
  planName: { fontSize: 24, fontWeight: "800" },
  summaryLine: { fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  planCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  planIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { fontSize: 18, fontWeight: "800" },
  planPrice: { fontSize: 13, marginTop: 2 },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "800" },
  planDescription: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  blockBanner: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  blockBannerText: { color: "#92400E", flex: 1, fontSize: 13, lineHeight: 18 },
  seatRow: { marginBottom: 14 },
  seatLabel: { fontSize: 12, fontWeight: "800", marginBottom: 8 },
  seatInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  primaryButton: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 2,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondaryButtonText: { fontWeight: "800", fontSize: 14 },
  dangerButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  dangerButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  footerNote: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 8,
  },
});
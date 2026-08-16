import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import PayHere from "@payhere/payhere-mobilesdk-reactnative";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import subscriptionApi from "../../api/subscriptionApi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const PLAN_META = {
  pro: {
    title: "Pro",
    price: 4000,
    accent: "#2563EB",
    icon: "zap",
    description: "Best for personal growth and deeper AI usage.",
  },
  business: {
    title: "Business",
    price: 3000,
    accent: "#0F766E",
    icon: "briefcase",
    description: "Built for teams, roles, and centralized billing.",
  },
};

const formatCurrency = (amount) => `LKR ${Number(amount || 0).toLocaleString("en-LK")}`;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* PayHere's onCompleted callback firing is not itself proof of payment -
 * it just means the native sheet reported success back to this device.
 * confirmPayHereReturn on the backend is the source of truth (it verifies
 * against PayHere's own webhook / Retrieval API, re-checking the amount),
 * and can briefly still say "pending" right after onCompleted fires if the
 * notify webhook hasn't landed yet. Poll a few times instead of taking the
 * first answer at face value - this is what "Payment complete" below
 * actually depends on being true. */
const CONFIRM_POLL_ATTEMPTS = 5;
const CONFIRM_POLL_DELAY_MS = 1500;

const confirmPaymentWithRetry = async (orderId) => {
  let lastData = null;
  for (let attempt = 0; attempt < CONFIRM_POLL_ATTEMPTS; attempt += 1) {
    try {
      lastData = await subscriptionApi.confirmReturn(orderId);
      if (!lastData?.pending) {
        return { confirmed: true, data: lastData };
      }
    } catch {
      lastData = null;
    }
    if (attempt < CONFIRM_POLL_ATTEMPTS - 1) {
      await wait(CONFIRM_POLL_DELAY_MS);
    }
  }
  return { confirmed: false, data: lastData };
};

export const SubscriptionCheckoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { refreshUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState(null);

  const planId = route.params?.planId || "pro";
  const seats = Math.max(1, Number(route.params?.seats) || 1);
  const plan = PLAN_META[planId] || PLAN_META.pro;

  const total = useMemo(
    () => (planId === "business" ? plan.price * Math.max(5, seats) : plan.price),
    [planId, plan.price, seats],
  );

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

  useFocusEffect(
    useCallback(() => {
      const selectedSeats = planId === "business" ? Math.max(5, seats) : 1;
      setSubscription({ planId, seats: selectedSeats });
    }, [planId, seats]),
  );

  const handlePayHereCheckout = async () => {
    try {
      setLoading(true);
      setError("");

      const checkoutSeats = planId === "business" ? Math.max(5, seats) : 1;

      // No returnUrl/cancelUrl needed here anymore - PayHere.startPayment
      // reports success/error/dismiss straight back into this screen via
      // its own callbacks, so there's no browser redirect or deep link to
      // arrange (see nativePayload built server-side in
      // initializePayHerePayment).
      const result = await subscriptionApi.initializeCheckout({
        planId,
        seats: checkoutSeats,
      });

      const orderId = result?.payload?.order_id || result?.payload?.orderId;
      const nativePayload = result?.nativePayload;

      if (!nativePayload || !orderId) {
        throw new Error("Checkout details were incomplete.");
      }

      PayHere.startPayment(
        nativePayload,
        async () => {
          // Completed - still confirm against the backend before telling
          // the user their plan is active (see comment above CONFIRM_POLL_*).
          const { confirmed } = await confirmPaymentWithRetry(orderId);
          await refreshUser?.();

          if (confirmed) {
            Alert.alert("Payment complete", "Your subscription is now active.");
          } else {
            Alert.alert(
              "Payment received",
              "We're still confirming it with PayHere. Your plan will update automatically in a moment - pull to refresh on the Subscription screen if it hasn't yet.",
            );
          }
          setLoading(false);
          navigation.navigate("SubscriptionHome");
        },
        (errorData) => {
          setLoading(false);
          setError(
            typeof errorData === "string" && errorData
              ? errorData
              : "PayHere reported an error. Please try again.",
          );
        },
        () => {
          // Unlike the old WebBrowser-based flow, PayHere's own SDK only
          // calls this when the user backed out without paying - no need
          // to hedge with a confirm-return check here.
          setLoading(false);
          setError("Payment was cancelled.");
        },
      );
    } catch (checkoutError) {
      setLoading(false);
      setError(
        checkoutError.response?.data?.message ||
          checkoutError.message ||
          "Unable to start checkout.",
      );
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backRow}
        accessibilityRole="button"
      >
        <Feather name="arrow-left" size={18} color={colors.text} />
        <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
      </TouchableOpacity>

      <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
        <Text style={styles.heroTitle}>Checkout</Text>
        <Text style={styles.heroSubtitle}>
          Review your plan and complete the payment in PayHere.
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          cardShadow,
        ]}
      >
        <View style={styles.planHeader}>
          <View style={[styles.planIcon, { backgroundColor: plan.accent }]}>
            <Feather name={plan.icon} size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.planTitle, { color: colors.text }]}>{plan.title}</Text>
            <Text style={[styles.planPrice, { color: colors.muted }]}>
              {planId === "business" ? `${formatCurrency(plan.price)} / seat` : formatCurrency(plan.price)}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: colors.muted }]}>{plan.description}</Text>

        <View style={styles.summaryList}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Plan</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{plan.title}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Seats</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {planId === "business" ? Math.max(5, seats) : 1}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: plan.accent }]}
          onPress={handlePayHereCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.payButtonText}>Proceed to PayHere</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.noteCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardShadow]}>
        <Text style={[styles.noteTitle, { color: colors.text }]}>What happens next</Text>
        <Text style={[styles.noteText, { color: colors.muted }]}>1. We create a PayHere checkout session.</Text>
        <Text style={[styles.noteText, { color: colors.muted }]}>2. PayHere opens as a secure payment sheet inside the app.</Text>
        <Text style={[styles.noteText, { color: colors.muted }]}>3. After success, we confirm the payment and take you to Subscription.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    gap: 14,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  backText: { fontSize: 14, fontWeight: "700" },
  hero: {
    borderRadius: 28,
    padding: 20,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  planIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { fontSize: 20, fontWeight: "800" },
  planPrice: { fontSize: 13, marginTop: 2 },
  description: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  summaryList: {
    gap: 10,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: "800" },
  payButton: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  errorBox: {
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: "#B91C1C", fontSize: 13 },
  noteCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  noteTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  noteText: { fontSize: 13, lineHeight: 19, marginBottom: 4 },
});

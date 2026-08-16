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
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import subscriptionApi from "../../api/subscriptionApi";
import { getApiBaseUrl } from "../../api/baseUrl";
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
      const returnUrl = Linking.createURL("subscription?payment=success");
      const cancelUrl = Linking.createURL("subscription?payment=cancelled");

      const result = await subscriptionApi.initializeCheckout({
        planId,
        seats: checkoutSeats,
        returnUrl,
        cancelUrl,
      });

      const orderId = result?.payload?.order_id || result?.payload?.orderId;
      const launchUrl = result?.checkoutUrl
        ? new URL(result.checkoutUrl, getApiBaseUrl()).toString()
        : null;

      if (!launchUrl || !orderId) {
        throw new Error("Checkout details were incomplete.");
      }

      // Must match the actual deep link the backend redirects back to on
      // success (returnUrl, sent above) - not the web app's dev URL - or
      // Expo's WebBrowser never recognizes the redirect as "success" and
      // falls through to the (less reliable) 'dismiss' handling below.
      const redirectMatchUrl = returnUrl;

      const browserResult = await WebBrowser.openAuthSessionAsync(
        launchUrl,
        redirectMatchUrl,
      );

      const returnedUrl = browserResult?.url || "";
      const parsed = returnedUrl ? Linking.parse(returnedUrl) : null;
      const paymentState = parsed?.queryParams?.payment;

      if (browserResult?.type === "success" || paymentState === "success") {
        try {
          await subscriptionApi.confirmReturn(orderId);
        } catch {
          // Handled on backend
        }
        await refreshUser?.();
        Alert.alert("Payment complete", "Your subscription is now active.");
        navigation.navigate("SubscriptionHome");
        return;
      }

      if (browserResult?.type === "dismiss" || browserResult?.type === "cancel") {
        try {
          await subscriptionApi.confirmReturn(orderId);
          await refreshUser?.();
          Alert.alert("Payment complete", "Your subscription is now active.");
          navigation.navigate("SubscriptionHome");
          return;
        } catch {
          // Payment was not confirmed
        }
        if (browserResult?.type === "cancel") {
          setError("Payment was cancelled.");
        }
        await refreshUser?.();
      }
    } catch (checkoutError) {
      setError(
        checkoutError.response?.data?.message ||
          checkoutError.message ||
          "Unable to start checkout.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.hero, { backgroundColor: colors.primaryStrong }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Checkout</Text>
          <Text style={styles.heroSubtitle}>
            Review your plan and complete the payment in PayHere.
          </Text>
        </View>
      </View>

      <View style={styles.body}>

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
        <Text style={[styles.noteText, { color: colors.muted }]}>2. PayHere opens in an in-app browser to collect payment.</Text>
        <Text style={[styles.noteText, { color: colors.muted }]}>3. After success, we confirm the payment and return you to Subscription.</Text>
      </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  content: {
    paddingBottom: 28,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 20,
    gap: 14,
  },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
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
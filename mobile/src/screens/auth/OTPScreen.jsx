import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export const OTPScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { verifyOTP, resendVerificationOTP, error } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Validation Error", "Please enter a valid 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(email, otp);
      Alert.alert("Success", "Email verified! Logging you in...");
    } catch (err) {
      Alert.alert("Verification Failed", err.response?.data?.message || error || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      await resendVerificationOTP(email);
      setResendTimer(60);
      Alert.alert("Success", "OTP resent to your email");
    } catch (err) {
      Alert.alert("Resend Failed", "Could not resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
        <Text style={[styles.emailText, { color: colors.muted }]}>OTP sent to: {email}</Text>

        {!!error && (
          <Text
            style={[styles.errorText, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder, color: colors.text }]}
          >
            {error}
          </Text>
        )}

        {/* Step 6 fix — label already has color in OTPScreen, no change needed */}
        <Text style={[styles.label, { color: colors.text }]}>6-digit OTP</Text>
        <TextInput
          style={[styles.otpInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          placeholder="000000"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          placeholderTextColor={colors.muted}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primaryStrong }, loading && styles.buttonDisabled]}
          onPress={handleVerifyOTP}
          disabled={loading}
        >
          {loading ? (
            // Step 5 fix — colors.buttonText now exists in ThemeContext
            <ActivityIndicator color={colors.buttonText} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResendOTP} disabled={resendTimer > 0 || resendLoading}>
          <Text style={[styles.link, { color: colors.primary }, resendTimer > 0 && styles.linkDisabled]}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : resendLoading ? "Sending..." : "Resend OTP"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={[styles.backLink, { color: colors.muted }]}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: "center" },
  scrollView: { flex: 1 },
  card: {
    borderWidth: 1, borderRadius: 24, padding: 20,
    // Step 4 fix — removed boxShadow, native shadow props added
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  emailText: { textAlign: "center", marginBottom: 14, fontSize: 13 },
  errorText: {
    borderRadius: 12, borderWidth: 1, paddingVertical: 10,
    paddingHorizontal: 12, marginBottom: 12, textAlign: "center", fontWeight: "600", fontSize: 12,
  },
  label: { marginBottom: 6, fontWeight: "700", fontSize: 13 },
  otpInput: {
    borderWidth: 1, paddingVertical: 14, marginBottom: 16,
    borderRadius: 14, fontSize: 24, letterSpacing: 5, textAlign: "center",
  },
  button: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginBottom: 14 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { fontWeight: "bold", fontSize: 16 },
  link: { textAlign: "center", marginBottom: 12, fontWeight: "700" },
  linkDisabled: { opacity: 0.5 },
  backLink: { textAlign: "center", marginTop: 2 },
});
import React, { useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export const ResetPasswordScreen = ({ navigation, route }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword, error } = useAuth();
  const { colors } = useTheme();

  const handleResetPassword = async () => {
    if (!otp || !newPassword || !confirmPassword) {
      Alert.alert("Validation Error", "Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);
      Alert.alert("Success", "Password reset successful! Please login.");
      navigation.navigate("Login");
    } catch (err) {
      Alert.alert("Failed", error || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Reset Password
        </Text>

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

        <Text style={[styles.label, { color: colors.text }]}>OTP Code</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.border,
              color: colors.text,
            },
          ]}
          placeholder="000000"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!loading}
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
        <View
          style={[
            styles.passwordContainer,
            { backgroundColor: colors.inputBg, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="••••••••"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>
          Confirm Password
        </Text>
        <View
          style={[
            styles.passwordContainer,
            { backgroundColor: colors.inputBg, borderColor: colors.border },
          ]}
        >
          <TextInput
            style={[styles.passwordInput, { color: colors.text }]}
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            editable={!loading}
            placeholderTextColor={colors.muted}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeButton}
          >
            <Feather
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={18}
              color={colors.muted}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primaryStrong },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text style={styles.link}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.12)",
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
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
  label: {
    marginBottom: 6,
    fontWeight: "700",
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderRadius: 14,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: 4,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  eyeButton: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  link: {
    textAlign: "center",
    fontWeight: "700",
  },
});

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
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { forgotPassword, error } = useAuth();
  const { colors } = useTheme();

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Validation Error", "Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      Alert.alert("Success", "OTP sent to your email");
      navigation.navigate("ResetPassword", { email });
    } catch (err) {
      Alert.alert("Failed", error || "Could not send OTP");
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
          Forgot Password
        </Text>

        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Enter your email and we will send an OTP to reset your password.
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

        <Text style={[styles.label, { color: colors.text }]}>
          Email Address
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
          placeholder="username@gmail.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
          placeholderTextColor={colors.muted}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primaryStrong },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleForgotPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
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
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 14,
    fontSize: 13,
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
    marginBottom: 16,
    borderRadius: 14,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
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

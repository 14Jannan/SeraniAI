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
  Image,
  Linking,
  Platform,
  useWindowDimensions,
} from "react-native";
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getApiBaseUrl } from "../../api/baseUrl";

export const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, error } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const apiUrl = getApiBaseUrl();

  const socialLogins = [
    {
      key: "google",
      label: "Google",
      icon: <AntDesign name="google" size={20} color="#4285F4" />,
      url: `${apiUrl}/auth/google`,
    },
    {
      key: "github",
      label: "GitHub",
      icon: <AntDesign name="github" size={20} color="#111827" />,
      url: `${apiUrl}/auth/github`,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: <FontAwesome name="facebook-square" size={20} color="#1877F2" />,
      url: `${apiUrl}/auth/facebook`,
    },
  ];

  const handleSocialLogin = async (url, label) => {
    try {
      if (Platform.OS === "web") {
        window.location.assign(url);
        return;
      }

      await Linking.openURL(url);
    } catch (openError) {
      Alert.alert("Unable to open link", `Could not start ${label} login`);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword)
      return Alert.alert("Validation Error", "Please fill in all fields");
    if (password !== confirmPassword)
      return Alert.alert("Validation Error", "Passwords do not match");
    if (password.length < 6)
      return Alert.alert(
        "Validation Error",
        "Password must be at least 6 characters",
      );

    setLoading(true);
    try {
      await register(email, password);
      navigation.navigate("OTP", { email });
    } catch (err) {
      Alert.alert("Registration Failed", error || "An error occurred");
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
      <View style={styles.heroCircleLarge} />
      <View style={styles.heroCircleSmall} />
      <View style={styles.topRow}>
        <Text style={[styles.topBrand, { color: colors.text }]}>SeraniAI</Text>
        <TouchableOpacity
          onPress={() => toggleTheme(mode === "light" ? "dark" : "light")}
          style={[
            styles.themeButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather
            name={mode === "light" ? "moon" : "sun"}
            size={16}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.brandWrap}>
        <Image
          source={{
            uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
          }}
          style={styles.robot}
        />
        <Text style={[styles.brandTitle, { color: colors.text }]}>
          Join SeraniAI
        </Text>
        <Text style={[styles.brandSubtitle, { color: colors.muted }]}>
          Start your learning journey today
        </Text>
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            maxWidth: isWide ? 760 : "100%",
            alignSelf: "center",
            width: "100%",
          },
        ]}
      >
        <Text style={[styles.formTitle, { color: colors.text }]}>
          Create Account
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

        <View style={styles.inputGroup}>
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
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <View
            style={[
              styles.passwordContainer,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.passwordInput, { color: colors.text }]}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              disabled={loading}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.inputGroup}>
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
              disabled={loading}
            >
              <Feather
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primaryStrong },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.dividerText, { color: colors.muted }]}>
            Or register with
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
        </View>

        <View style={styles.socialRow}>
          {socialLogins.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.socialButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleSocialLogin(item.url, item.label)}
            >
              {item.icon}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.loginContainer}>
          <Text style={[styles.hasAccount, { color: colors.muted }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Login here
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: "center" },
  scrollView: {
    flex: 1,
  },
  heroCircleLarge: {
    position: "absolute",
    top: -80,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59,130,246,0.10)",
  },
  heroCircleSmall: {
    position: "absolute",
    bottom: 40,
    left: -45,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(168,85,247,0.10)",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topBrand: { fontSize: 16, fontWeight: "900" },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandWrap: { alignItems: "center", marginBottom: 14 },
  robot: { width: 84, height: 84, marginBottom: 6 },
  brandTitle: { fontSize: 28, fontWeight: "bold" },
  brandSubtitle: { fontSize: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.12)",
    elevation: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
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
  inputGroup: { marginBottom: 12 },
  label: { marginBottom: 6, fontWeight: "700", fontSize: 13 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: 4,
  },
  passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12 },
  eyeButton: { width: 40, alignItems: "center", justifyContent: "center" },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 10, fontSize: 12, fontWeight: "700" },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 18,
  },
  socialButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    boxShadow: "0px 4px 8px rgba(15, 23, 42, 0.08)",
    elevation: 2,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  hasAccount: {},
  link: { fontWeight: "700" },
});

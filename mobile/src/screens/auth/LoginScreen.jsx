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

export const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, error } = useAuth();
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const apiUrl = getApiBaseUrl();

  const socialLogins = [
    {
      key: "google",
      label: "Google",
      color: "#4285F4",
      icon: <AntDesign name="google" size={20} color="#4285F4" />,
      url: `${apiUrl}/auth/google`,
    },
    {
      key: "github",
      label: "GitHub",
      color: "#111827",
      icon: <AntDesign name="github" size={20} color="#111827" />,
      url: `${apiUrl}/auth/github`,
    },
    {
      key: "facebook",
      label: "Facebook",
      color: "#1877F2",
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Validation Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert("Login Failed", error || "An error occurred");
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
        <Text style={styles.brandTitle}>SeraniAI</Text>
        <Text style={[styles.brandSubtitle, { color: colors.muted }]}>
          Your intelligent companion
        </Text>
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            maxWidth: isWide ? 720 : "100%",
            alignSelf: "center",
            width: "100%",
          },
        ]}
      >
        <Text style={[styles.formTitle, { color: colors.text }]}>
          Welcome Back
        </Text>
        <Text style={[styles.formSubtitle, { color: colors.muted }]}>
          Sign in to continue your journey
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
          <Text style={styles.label}>Email Address</Text>
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
          <Text style={styles.label}>Password</Text>
          <View
            style={[
              styles.passwordContainer,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
              style={styles.eyeButton}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={[styles.linkRight, { color: colors.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.primaryStrong },
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.dividerText, { color: colors.muted }]}>
            Or continue with
          </Text>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
        </View>

        <View style={styles.socialRow}>
          {socialLogins.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.socialButton}
              onPress={() => handleSocialLogin(item.url, item.label)}
            >
              {item.icon}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.registerContainer}>
          <Text style={[styles.noAccount, { color: colors.muted }]}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text style={[styles.link, { color: colors.primary }]}>
              Register for free
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
  },
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
    backgroundColor: "#DBEAFE",
  },
  heroCircleSmall: {
    position: "absolute",
    bottom: 50,
    left: -45,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#E9D5FF",
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  topBrand: {
    fontSize: 16,
    fontWeight: "900",
  },
  themeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  robot: {
    width: 88,
    height: 88,
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: "900",
  },
  brandSubtitle: {
    fontSize: 13,
  },
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
  },
  formSubtitle: {
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
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
  inputGroup: {
    marginBottom: 12,
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
    borderRadius: 14,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingRight: 4,
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
  linkRight: {
    textAlign: "right",
    marginBottom: 14,
    fontWeight: "700",
    fontSize: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    fontWeight: "700",
  },
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
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  noAccount: {},
  link: {
    fontWeight: "700",
  },
});

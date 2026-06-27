import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export const LandingScreen = ({ navigation }) => {
  const { colors, mode, toggleTheme } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef(null);
  const isWide = width >= 768;
  const isMedium = width >= 520;

  const features = [
    {
      name: "Journal",
      description:
        "Keep track of your thoughts and ideas with AI-powered journaling that learns from your writing style.",
      icon: "edit-3",
      accent: colors.accentAlt,
    },
    {
      name: "AI Chat",
      description:
        "Access personalized learning paths and courses tailored to your goals and learning pace.",
      icon: "message-circle",
      accent: colors.primary,
    },
    {
      name: "Course",
      description:
        "Have natural conversations with Serani AI to get answers, brainstorm, or just chat.",
      icon: "book-open",
      accent: colors.accent,
    },
    {
      name: "Calendar",
      description:
        "Smart scheduling that adapts to your routine and helps you stay organized effortlessly.",
      icon: "calendar",
      accent: "#F97316",
    },
  ];

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroBlobOne} />
      <View style={styles.heroBlobTwo} />

      {/* ── Header ── */}
      <View style={styles.headerWrap}>
        {/* Brand — shrinks if needed */}
        <View style={styles.brandBlock}>
          <Text style={[styles.brand, { color: colors.text }]}>SeraniAI</Text>
          <Text style={[styles.headerText, { color: colors.muted }]}>
            AI-powered virtual assistant
          </Text>
        </View>

        {/* Actions — fixed width so they never overflow */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => toggleTheme(mode === "light" ? "dark" : "light")}
            style={[
              styles.themeButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Feather
              name={mode === "light" ? "moon" : "sun"}
              size={16}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={[
              styles.headerLink,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.headerLinkText, { color: colors.text }]}>
              Login
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            style={[
              styles.headerPrimary,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.headerPrimaryText,
                { color: colors.primaryText },
              ]}
            >
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero Card ── */}
      <View
        style={[
          styles.heroCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.heroGrid,
            { flexDirection: isWide ? "row" : "column" },
          ]}
        >
          <View style={[styles.heroCopy, { flex: isWide ? 1 : undefined }]}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>
              Meet SeraniAI
            </Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Your Smart{"\n"}Companion
            </Text>
            <Text style={[styles.heroDescription, { color: colors.muted }]}>
              Serani AI brings the power of modern artificial intelligence into
              one smart system. With cutting-edge technology and adaptive
              learning, Serani AI is built for the future.
            </Text>

            {/* CTA buttons — each takes equal space, no overflow */}
            <View style={styles.ctaRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                style={[
                  styles.primaryCta,
                  { backgroundColor: colors.primary, flex: 1 },
                ]}
              >
                <Text
                  style={[
                    styles.primaryCtaText,
                    { color: colors.primaryText },
                  ]}
                >
                  START NOW
                </Text>
                <Feather
                  name="arrow-right"
                  size={16}
                  color={colors.primaryText}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  scrollRef.current?.scrollTo({ y: 520, animated: true })
                }
                style={[
                  styles.secondaryCta,
                  {
                    backgroundColor: colors.surfaceAlt,
                    borderColor: colors.border,
                    flex: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.secondaryCtaText,
                    { color: colors.text },
                  ]}
                >
                  Learn More
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroVisualWrap}>
            <View
              style={[
                styles.heroGlow,
                { backgroundColor: colors.heroStart },
              ]}
            />
            <Image
              source={{
                uri: "https://cdn-icons-png.flaticon.com/512/4712/4712035.png",
              }}
              resizeMode="contain"
              style={[
                styles.robot,
                {
                  width: isWide ? 280 : isMedium ? 200 : 160,
                  height: isWide ? 280 : isMedium ? 200 : 160,
                },
              ]}
            />
            <Text style={[styles.visualTitle, { color: colors.text }]}>
              SeraniAI
            </Text>
            <Text style={[styles.visualSubtitle, { color: colors.muted }]}>
              AI-powered virtual assistant
            </Text>
          </View>
        </View>
      </View>

      {/* ── Section heading ── */}
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Everything You Need, All in One Place
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.muted }]}>
          Discover the powerful features that make SeraniAI your ultimate AI
          companion for productivity and growth.
        </Text>
      </View>

      {/* ── Feature cards ── */}
      <View
        style={[
          styles.featuresGrid,
          { flexDirection: isWide ? "row" : "column" },
        ]}
      >
        {features.map((feature) => (
          <View
            key={feature.name}
            style={[
              styles.featureCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                width: isWide ? "24%" : "100%",
              },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: feature.accent },
              ]}
            >
              <Feather name={feature.icon} size={18} color="#FFFFFF" />
            </View>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              {feature.name}
            </Text>
            <Text
              style={[styles.featureDescription, { color: colors.muted }]}
            >
              {feature.description}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  scrollView: { flex: 1 },

  heroBlobOne: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(59,130,246,0.12)",
  },
  heroBlobTwo: {
    position: "absolute",
    top: 160,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(34,197,94,0.10)",
  },

  // ── Header ──────────────────────────────────────────
  headerWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  // brand block shrinks so actions never get pushed off screen
  brandBlock: {
    flexShrink: 1,
    marginRight: 8,
  },
  brand: {
    fontSize: 20,
    fontWeight: "900",
  },
  headerText: {
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0, // never shrink — keeps buttons fully visible
  },
  themeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLink: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerLinkText: {
    fontWeight: "800",
    fontSize: 13,
  },
  headerPrimary: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerPrimaryText: {
    fontWeight: "800",
    fontSize: 13,
  },

  // ── Hero ────────────────────────────────────────────
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  heroGrid: {
    gap: 16,
    alignItems: "center",
  },
  heroCopy: {
    width: "100%",
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroDescription: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 23,
  },
  // buttons sit side by side, each flex:1 so they split available space equally
  ctaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  primaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: "900",
  },
  secondaryCta: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: "900",
  },

  heroVisualWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.75,
  },
  robot: {},
  visualTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  visualSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // ── Features ─────────────────────────────────────────
  sectionHead: {
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  featuresGrid: {
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  featureDescription: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
  },
});
import React from "react";
import { View, Alert } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardScreen } from "../screens/app/DashboardScreen";
import { AIChatbotScreen } from "../screens/app/AIChatbotScreen";
import { CoursesScreen } from "../screens/app/CoursesScreen";
import { SubscriptionScreen } from "../screens/app/SubscriptionScreen";
import { SubscriptionCheckoutScreen } from "../screens/app/SubscriptionCheckoutScreen";
import { JournalScreen } from "../screens/app/JournalScreen";
import { AddJournalScreen } from "../screens/app/AddJournalScreen";
import { JournalInsightsScreen } from "../screens/app/JournalInsightsScreen";
import { JournalMoodPieScreen } from "../screens/app/JournalMoodPieScreen";
import { CourseDetailsScreen } from "../screens/app/CourseDetailsScreen";
import { TasksScreen } from "../screens/app/TasksScreen";
import { ProfileScreen } from "../screens/app/ProfileScreen";
import { AdminAccessScreen } from "../screens/app/AdminAccessScreen";
import { EnterpriseManagerScreen } from "../screens/app/EnterpriseManagerScreen";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { isPaidRole } from "../utils/roles";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ── Individual stacks ─────────────────────────────────────

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />
    <Stack.Screen name="AIChatbot" component={AIChatbotScreen} />
  </Stack.Navigator>
);

const CoursesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CoursesList" component={CoursesScreen} />
    <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
  </Stack.Navigator>
);

const SubscriptionStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SubscriptionHome" component={SubscriptionScreen} />
    <Stack.Screen name="SubscriptionCheckout" component={SubscriptionCheckoutScreen} />
  </Stack.Navigator>
);

const JournalStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="JournalHome" component={JournalScreen} />
    <Stack.Screen name="JournalEditor" component={AddJournalScreen} />
    <Stack.Screen name="JournalInsights" component={JournalInsightsScreen} />
    <Stack.Screen name="JournalMoodPie" component={JournalMoodPieScreen} />
  </Stack.Navigator>
);

const TasksStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TasksHome" component={TasksScreen} />
  </Stack.Navigator>
);

const EnterpriseStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="EnterpriseHome" component={EnterpriseManagerScreen} />
  </Stack.Navigator>
);

// ── Bottom Tab Navigator (NO Plan tab) ────────────────────

const TabNavigatorContent = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(12, insets.bottom + 8);
  const isPaidUser = isPaidRole(user?.role);

  const blockIfLocked = (label) => ({
    tabPress: (e) => {
      if (isPaidUser) return;
      e.preventDefault();
      Alert.alert(
        "Pro feature",
        `${label} is available on the Pro plan. Upgrade to unlock it.`,
        [
          { text: "Not now", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
        ],
      );
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 62 + insets.bottom,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700",
          lineHeight: 16,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStack}
        options={{
          tabBarLabel: "Home",
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesStack}
        options={{
          tabBarLabel: "Courses",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size} color={color} />
          ),
        }}
        listeners={blockIfLocked("My Courses")}
      />
      {/* Subscription — hidden from tab bar, bottom bar stays visible */}
      <Tab.Screen
        name="Subscription"
        component={SubscriptionStack}
        options={{
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalStack}
        options={{
          tabBarLabel: "Journal",
          tabBarIcon: ({ color, size }) => (
            <Feather name="edit-3" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksStack}
        options={{
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={size} color={color} />
          ),
        }}
        listeners={blockIfLocked("Daily Tasks")}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
      {user?.role === "enterpriseAdmin" && (
        <Tab.Screen
          name="Enterprise"
          component={EnterpriseStack}
          options={{
            title: "Enterprise Manager",
            tabBarLabel: "Enterprise",
            tabBarIcon: ({ color, size }) => (
              <Feather name="users" size={size} color={color} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

const TabNavigator = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <TabNavigatorContent />
    </View>
  );
};

// ── Root Stack ────────────────────────────────────────────

export const AppStack = () => {
  const { user } = useAuth();

  // If user is a System Admin, direct them to web app notice
  if (user?.role === "admin") {
    return <AdminAccessScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  );
};

import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const DashboardStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="DashboardHome" component={DashboardScreen} />

      <Stack.Screen name="AIChatbot" component={AIChatbotScreen} />
    </Stack.Navigator>
);

const CoursesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="CoursesList" component={CoursesScreen} />
    <Stack.Screen name="CourseDetails" component={CourseDetailsScreen} />
  </Stack.Navigator>
);

const SubscriptionStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="SubscriptionHome" component={SubscriptionScreen} />
    <Stack.Screen
      name="SubscriptionCheckout"
      component={SubscriptionCheckoutScreen}
    />
  </Stack.Navigator>
);

const JournalStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="JournalHome" component={JournalScreen} />
    <Stack.Screen name="JournalEditor" component={AddJournalScreen} />
    <Stack.Screen name="JournalInsights" component={JournalInsightsScreen} />
    <Stack.Screen name="JournalMoodPie" component={JournalMoodPieScreen} />
  </Stack.Navigator>
);

const TasksStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="TasksHome" component={TasksScreen} />
  </Stack.Navigator>
);

export const AppStack = () => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(12, insets.bottom + 8);

  React.useEffect(() => {
    const allowedRoles = [
      "user",
      "enterpriseUser",
      "enterpriseAdmin",
      "enterprise",
      "(Pro)PlanUser",
      "admin",
    ];

    if (user?.role && !allowedRoles.includes(user.role)) {
      logout();
    }
  }, [logout, user?.role]);

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
          title: "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesStack}
        options={{
          title: "Courses",
          tabBarLabel: "Courses",
          tabBarIcon: ({ color, size }) => (
            <Feather name="book-open" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Subscription"
        component={SubscriptionStack}
        options={{
          title: "Subscription",
          tabBarLabel: "Plan",
          tabBarIcon: ({ color, size }) => (
            <Feather name="credit-card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Journal"
        component={JournalStack}
        options={{
          title: "Journal",
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
          title: "Tasks",
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

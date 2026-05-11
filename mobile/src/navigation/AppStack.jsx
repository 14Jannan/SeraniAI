import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { DashboardScreen } from "../screens/app/DashboardScreen";
import { CoursesScreen } from "../screens/app/CoursesScreen";
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
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
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

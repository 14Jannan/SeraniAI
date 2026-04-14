import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { AuthStack } from "./AuthStack";
import { AppStack } from "./AppStack";
import { linking } from "./linking";
import { useTheme } from "../context/ThemeContext";

export const RootNavigator = () => {
  const { isLoading, isSignedIn } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      fallback={<ActivityIndicator color={colors.primary} />}
    >
      {isSignedIn ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

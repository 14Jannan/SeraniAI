import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { LandingScreen } from "../screens/auth/LandingScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { OTPScreen } from "../screens/auth/OTPScreen";
import { ForgotPasswordScreen } from "../screens/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../screens/auth/ResetPasswordScreen";

const Stack = createStackNavigator();

export const AuthStack = () => {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

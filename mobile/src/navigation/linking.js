import * as Linking from "expo-linking";

const prefix = Linking.createURL("/");

export const linking = {
  prefixes: [prefix, "seraniaiapp://"],
  config: {
    screens: {
      Landing: "",
      Login: "auth/login",
      Register: "auth/register",
      OTP: "auth/otp",
      ForgotPassword: "auth/forgot-password",
      ResetPassword: "auth/reset-password",
      OAuthCallback: "auth/oauth-callback",
      Dashboard: "dashboard",
      Courses: "courses",
      CourseDetails: "courses/:id",
      Journal: "journal",
      AdminDashboard: "admin/dashboard",
      AdminCourses: "admin/courses",
      AdminUsers: "admin/users",
      AIChatbot: "chatbot",
      Profile: "profile",
    },
  },
};

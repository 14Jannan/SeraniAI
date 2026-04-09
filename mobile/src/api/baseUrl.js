import { Platform } from "react-native";
import Constants from "expo-constants";

export const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return "http://localhost:7001/api";
  }

  return Constants.expoConfig?.extra?.apiUrl || "http://localhost:7001/api";
};

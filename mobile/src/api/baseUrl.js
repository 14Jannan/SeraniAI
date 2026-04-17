import { Platform } from "react-native";
import Constants from "expo-constants";

const DEFAULT_LOCAL_API_URL = "http://localhost:7001/api";

const normalizeApiUrl = (url) => {
  if (!url) {
    return null;
  }

  return String(url).replace(/\/$/, "");
};

const getMetroHostUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(":")[0];
  return host ? `http://${host}:7001/api` : null;
};

export const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    return DEFAULT_LOCAL_API_URL;
  }

  const explicitUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  const metroHostUrl = normalizeApiUrl(getMetroHostUrl());
  const expoConfiguredUrl = normalizeApiUrl(
    Constants.expoConfig?.extra?.apiUrl,
  );

  return (
    explicitUrl ||
    metroHostUrl ||
    expoConfiguredUrl ||
    "http://10.0.2.2:7001/api" ||
    DEFAULT_LOCAL_API_URL
  );
};

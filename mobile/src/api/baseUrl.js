import { Platform } from "react-native";
import Constants from "expo-constants";

const DEFAULT_LOCAL_API_URL = "http://localhost:7001/api";

const normalizeApiUrl = (url) => {
  if (!url) {
    return null;
  }

  return String(url).replace(/\/$/, "");
};

const isLoopbackHost = (host) =>
  host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";

const extractHost = (hostValue) => {
  if (!hostValue) {
    return null;
  }

  const host = String(hostValue).split(":")[0];
  if (!host || isLoopbackHost(host)) {
    return null;
  }

  return host;
};

const getMetroHostUrl = () => {
  const hostCandidates = [
    Constants.expoConfig?.hostUri ||
      Constants.expoGoConfig?.hostUri ||
      Constants.expoGoConfig?.debuggerHost ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.debuggerHost ||
      Constants.manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const hostValue of hostCandidates) {
    const host = extractHost(hostValue);
    if (host) {
      return `http://${host}:7001/api`;
    }
  }

  return null;
};

export const getApiBaseUrl = () => {
  if (Platform.OS === "web") {
    console.log("[API] Using web platform URL:", DEFAULT_LOCAL_API_URL);
    return DEFAULT_LOCAL_API_URL;
  }

  const explicitUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
  const metroHostUrl = normalizeApiUrl(getMetroHostUrl());
  const expoConfiguredUrl = normalizeApiUrl(
    Constants.expoConfig?.extra?.apiUrl,
  );
  const platformFallbackUrl =
    Platform.OS === "android"
      ? "http://10.0.2.2:7001/api"
      : DEFAULT_LOCAL_API_URL;

  const selectedUrl =
    explicitUrl || metroHostUrl || expoConfiguredUrl || platformFallbackUrl;

  console.log("[API] Selected base URL:", selectedUrl);
  console.log("[API] Resolution debug:", {
    explicitUrl,
    metroHostUrl,
    expoConfiguredUrl,
    platformFallbackUrl,
    platform: Platform.OS,
  });

  return selectedUrl;
};

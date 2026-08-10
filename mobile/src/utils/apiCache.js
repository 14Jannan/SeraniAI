// Lightweight response cache for the mobile app's API layer.
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "apiCache:";
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

const cacheKey = (key) => `${CACHE_PREFIX}${key}`;

const readEntry = async (key) => {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(key));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    // Corrupt or unreadable entry -- treat as a cache miss rather than
    // throwing, since a cache failure should never break the screen.
    return null;
  }
};

const writeEntry = async (key, data) => {
  try {
    const entry = { data, cachedAt: Date.now() };
    await AsyncStorage.setItem(cacheKey(key), JSON.stringify(entry));
  } catch {
    // Storage full/unavailable -- caching is a best-effort optimization.
  }
};

/**
 * Fetch `key`, using the cache when possible.
 *  - No cache entry: fetch fresh, cache it, return it.
 *  - Fresh cache entry (younger than maxAgeMs): return it immediately, no network call.
 *  - Stale cache entry: return it immediately AND refetch in the background (stale-while-revalidate).
 *  - Network failure with no usable cache: the error propagates.
 *  - Network failure but a stale cache entry exists: stale data is returned instead of throwing.
 */
export const getWithCache = async (key, fetcher, options = {}) => {
  const { maxAgeMs = DEFAULT_MAX_AGE_MS, forceRefresh = false } = options;
  const entry = forceRefresh ? null : await readEntry(key);
  const isFresh = entry && Date.now() - entry.cachedAt < maxAgeMs;

  if (isFresh) {
    return entry.data;
  }

  if (entry) {
    fetcher()
      .then((fresh) => writeEntry(key, fresh))
      .catch(() => {});
    return entry.data;
  }

  try {
    const fresh = await fetcher();
    await writeEntry(key, fresh);
    return fresh;
  } catch (err) {
    throw err;
  }
};

/** Remove one cached entry. Call after a mutation that invalidates it. */
export const invalidateCache = async (key) => {
  try {
    await AsyncStorage.removeItem(cacheKey(key));
  } catch {
    // best-effort
  }
};

/** Remove every cached API response, e.g. on logout. */
export const clearApiCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // best-effort
  }
};
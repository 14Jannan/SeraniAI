const TOKEN_KEY = "token";
const USER_KEY = "user";
const REMEMBER_ME_KEY = "rememberMe";

const isValidStoredValue = (value) =>
  value !== null && value !== undefined && value !== "undefined" && value !== "null";

const safeGetItem = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
};

const safeSetItem = (storage, key, value) => {
  try {
    storage.setItem(key, value);
  } catch (error) {
    // Ignore storage failures so auth flows can still continue.
  }
};

const safeRemoveItem = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch (error) {
    // Ignore storage failures so logout cleanup remains best-effort.
  }
};

const parseStoredUser = (value) => {
  if (!isValidStoredValue(value)) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const getPreferredStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const localToken = safeGetItem(localStorage, TOKEN_KEY);
  if (isValidStoredValue(localToken)) {
    return localStorage;
  }

  const sessionToken = safeGetItem(sessionStorage, TOKEN_KEY);
  if (isValidStoredValue(sessionToken)) {
    return sessionStorage;
  }

  const rememberMe = safeGetItem(localStorage, REMEMBER_ME_KEY) === "true";
  return rememberMe ? localStorage : sessionStorage;
};

export const getAuthStorageMode = () => {
  const storage = getPreferredStorage();

  if (!storage) {
    return null;
  }

  return storage === localStorage ? "localStorage" : "sessionStorage";
};

export const getStoredToken = () => {
  const storage = getPreferredStorage();
  if (!storage) {
    return null;
  }

  const token = safeGetItem(storage, TOKEN_KEY);
  return isValidStoredValue(token) ? token : null;
};

export const getStoredUser = () => {
  const storage = getPreferredStorage();
  if (!storage) {
    return null;
  }

  const user = parseStoredUser(safeGetItem(storage, USER_KEY));
  if (user) {
    return user;
  }

  const fallbackStorage = storage === localStorage ? sessionStorage : localStorage;
  return parseStoredUser(safeGetItem(fallbackStorage, USER_KEY));
};

export const hasStoredAuth = () => Boolean(getStoredToken());

export const getAuthDestination = (user) => {
  const role = user?.role;

  if (role === "admin") {
    return "/admin/users";
  }

  if (role === "enterpriseAdmin") {
    return "/dashboard/enterprise-manager";
  }

  return "/dashboard";
};

export const saveAuthSession = ({ token, user, rememberMe = false }) => {
  if (typeof window === "undefined") {
    return;
  }

  const primaryStorage = rememberMe ? localStorage : sessionStorage; //save here
  const secondaryStorage = rememberMe ? sessionStorage : localStorage; //clean this

  if (isValidStoredValue(token)) {
    safeSetItem(primaryStorage, TOKEN_KEY, token);
    safeRemoveItem(secondaryStorage, TOKEN_KEY);
  }

  if (user) {
    safeSetItem(primaryStorage, USER_KEY, JSON.stringify(user));
    safeRemoveItem(secondaryStorage, USER_KEY);
  }

  if (rememberMe) {
    safeSetItem(localStorage, REMEMBER_ME_KEY, "true");
  } else {
    safeRemoveItem(localStorage, REMEMBER_ME_KEY);
  }
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }

  [localStorage, sessionStorage].forEach((storage) => {
    safeRemoveItem(storage, TOKEN_KEY);
    safeRemoveItem(storage, USER_KEY);
  });

  safeRemoveItem(localStorage, REMEMBER_ME_KEY);
};

# Authentication Review: Cookies, Access Tokens & Refresh Tokens

## Overview

Your authentication implementation uses JWT tokens with HTTP-only cookies for refresh tokens. Below is a detailed analysis of what's working and what needs fixing.

---

## ✅ WHAT'S WORKING WELL

### 1. **Token Separation Strategy**

- **Access Token**: 15 minutes (short-lived) - Good ✓
- **Refresh Token**: 7 days (long-lived) in HTTPOnly cookie - Good ✓
- Prevents long-lived tokens from being exposed in localStorage

### 2. **HTTPOnly Cookies**

- `httpOnly: true` protects against XSS attacks ✓
- Refresh token can't be accessed via JavaScript

### 3. **Cookie Settings**

- `sameSite: "Lax"` provides CSRF protection for state-changing requests ✓
- `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days) aligns with JWT expiry ✓

### 4. **Protected OAuth Token Endpoint**

- `/api/auth/oauth/:provider/token` uses `protect` middleware ✓

### 5. **Email Verification**

- OTP-based verification before allowing login ✓

---

## ⚠️ CRITICAL ISSUES TO FIX

### 1. **Production Security: `secure: false` in Cookie** 🔴

**Location**: `authController.js` line 38 & `authRoutes.js` line 51

**Current Code**:

```javascript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: false, // ❌ PROBLEM: Should be true in production
  sameSite: "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

**Issue**:

- `secure: false` allows cookies over HTTP (unsafe over internet)
- Should only be false in local development

**Fix**: Make it environment-based

```javascript
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure:
    process.env.NODE_ENV === "production" ||
    process.env.SECURE_COOKIES === "true",
  sameSite: "Lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

---

### 2. **Duplicate Token Generation Logic** 🟠

**Location**: Two identical functions exist:

- `authController.js` line 16: `generateAuthTokens()`
- `authRoutes.js` line 32: `generateTokens()`

**Issue**:

- Code duplication leads to maintenance headaches
- If one is updated, the other might not be
- Inconsistent naming

**Fix**: Use only the one in authController and import it in authRoutes

---

### 3. **No Token Rotation on Refresh** 🟠

**Location**: `authController.js` line 311 - `refreshAccessToken`

**Current Code**:

```javascript
exports.refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  // ... verify ...
  const accessToken = jwt.sign(...);
  res.json({ token: accessToken }); // ❌ Only returns new access token
};
```

**Issue**:

- Only returns new access token, doesn't issue new refresh token
- If refresh token is compromised, attacker can use it indefinitely (until 7 days expire)
- Best practice: Issue new refresh token with each refresh

**Fix**: Issue new refresh token and set it in cookie

```javascript
exports.refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken)
    return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { accessToken, refreshToken: newRefreshToken } =
      generateAuthTokens(user);
    setRefreshCookie(res, newRefreshToken); // ✓ Set new refresh token

    res.json({ token: accessToken });
  } catch (error) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
};
```

---

### 4. **Missing Environment Variable Validation** 🟠

**Location**: `authController.js` line 16-30

**Issue**:

- No check if `JWT_SECRET` or `JWT_REFRESH_SECRET` env vars exist
- Silent failure if secrets are missing in production

**Fix**: Add validation on server startup

```javascript
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be defined in .env");
}
```

---

## ⚡ OPTIONAL IMPROVEMENTS

### 1. **Token Refresh Rate Limiting** (Recommended)

- Consider rate-limiting the refresh endpoint to prevent abuse
- Current: No protection against rapid token refresh attacks

### 2. **Add Token Blacklist/Revocation** (For Sign Out)

- Current logout just clears the cookie but token is still valid if compromised
- Could maintain a short-lived blacklist of invalidated tokens

### 3. **Include More Data in Refresh Token** (Consider)

- Current refresh token only has `id`
- Could validate role/permissions haven't changed since token issued

### 4. **Consistent Cookie Configuration Helper**

- Move `setRefreshCookie` to a utility file imported in both controller and routes
- Ensure both locations use identical settings

### 5. **OAuth Provider Token Handling**

- Review [oauthTokenService.js](oauthTokenService.js) for proper token refresh logic
- Ensure expired OAuth tokens are detected and refreshed automatically

---

## 🔐 SECURITY CHECKLIST

| Item                     | Status | Notes                                   |
| ------------------------ | ------ | --------------------------------------- |
| Access Token Short-Lived | ✓      | 15 min - Good                           |
| Refresh Token Long-Lived | ✓      | 7 days - Good                           |
| HTTPOnly Cookies         | ✓      | Prevents XSS                            |
| SameSite Protection      | ✓      | Prevents CSRF                           |
| Secure Flag (Prod)       | ❌     | FIX: Set based on NODE_ENV              |
| Token Rotation           | ❌     | FIX: Issue new refresh token on refresh |
| Environment Variables    | ⚠️     | FIX: Validate on startup                |
| Duplicate Code           | ❌     | FIX: Remove duplication                 |

---

## 📋 RECOMMENDED FIXES (Priority Order)

1. **CRITICAL**: Fix `secure: false` to be environment-aware
2. **HIGH**: Implement token rotation in refresh endpoint
3. **HIGH**: Remove duplicate token generation functions
4. **MEDIUM**: Add environment variable validation
5. **LOW**: Implement rate limiting on refresh endpoint

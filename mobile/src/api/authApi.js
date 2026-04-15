import httpClient from './httpClient';

const authApi = {
  // Register user
  async register(email, password) {
    const response = await httpClient.post('/auth/register', {
      email,
      password,
    });
    return response.data;
  },

  // Verify OTP during registration
  async verifyOTP(email, otp) {
    const response = await httpClient.post('/auth/verify', {
      email,
      otp,
    });
    return response.data;
  },

  // Login user
  async login(email, password) {
    const response = await httpClient.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  // Refresh token
  async refreshToken(refreshToken) {
    const response = await httpClient.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  // Logout user
  async logout() {
    const response = await httpClient.post('/auth/logout');
    return response.data;
  },

  // Forgot password - send OTP
  async forgotPassword(email) {
    const response = await httpClient.post('/auth/forgot-password', {
      email,
    });
    return response.data;
  },

  // Reset password
  async resetPassword(email, otp, newPassword) {
    const response = await httpClient.post('/auth/reset-password', {
      email,
      otp,
      newPassword,
    });
    return response.data;
  },

  // OAuth login (opens browser, returns code)
  async oauthLogin(provider, code) {
    const response = await httpClient.post('/auth/oauth-callback', {
      provider,
      code,
    });
    return response.data;
  },

  // Get current user (verify token validity)
  async getCurrentUser() {
    const response = await httpClient.get('/auth/me');
    return response.data;
  },
};

export default authApi;
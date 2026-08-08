import httpClient from "./httpClient";

/* API base path for enterprise admin endpoints */
/* Note: httpClient baseURL already includes /api, so no /api prefix here */
const BASE = "/enterprise-admin";

/* Fetch all users and pending/expired invites in the enterprise with seat info */
export const getEnterpriseUsers = () => httpClient.get(`${BASE}/users`);

/* Send an invitation email to a registered user to join the enterprise */
export const addUserToEnterprise = (email) =>
  httpClient.post(`${BASE}/users`, { email });

/* Update a member's name, email, or status within the enterprise */
export const updateEnterpriseUser = (id, userData) =>
  httpClient.put(`${BASE}/users/${id}`, userData);

/* Permanently remove a member from the enterprise */
export const deleteEnterpriseUser = (id) =>
  httpClient.delete(`${BASE}/users/${id}`);

/* Revoke a pending enterprise invitation by its ID */
export const revokeEnterpriseInvite = (id) =>
  httpClient.patch(`${BASE}/invites/${id}/revoke`, {});

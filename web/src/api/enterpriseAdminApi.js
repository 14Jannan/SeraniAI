import axios from 'axios';

/* API configuration for enterprise admin endpoints */
const API_URL = 'http://localhost:7001';
const ENTERPRISE_ADMIN_API_URL = `${API_URL}/api/enterprise-admin`;

/* Helper function to construct authorization headers from stored JWT token */
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

/* Fetch all users and invites in the enterprise */
export const getEnterpriseUsers = () => {
    return axios.get(`${ENTERPRISE_ADMIN_API_URL}/users`, getAuthHeaders());
};

/* Send an invitation to a user by email to join the enterprise */
export const addUserToEnterprise = (email) => {
    return axios.post(`${ENTERPRISE_ADMIN_API_URL}/users`, { email }, getAuthHeaders());
};

/* Update a user's information within the enterprise */
export const updateEnterpriseUser = (id, userData) => {
    return axios.put(`${ENTERPRISE_ADMIN_API_URL}/users/${id}`, userData, getAuthHeaders());
};

/* Deactivate an active user in the enterprise */
export const deactivateEnterpriseUser = (id) => {
    return axios.patch(`${ENTERPRISE_ADMIN_API_URL}/users/${id}/deactivate`, {}, getAuthHeaders());
};

/* Remove a user completely from the enterprise */
export const deleteEnterpriseUser = (id) => {
    return axios.delete(`${ENTERPRISE_ADMIN_API_URL}/users/${id}`, getAuthHeaders());
};

/* Revoke a pending enterprise invitation by ID */
export const revokeEnterpriseInvite = (id) => {
    return axios.patch(`${ENTERPRISE_ADMIN_API_URL}/invites/${id}/revoke`, {}, getAuthHeaders());
};

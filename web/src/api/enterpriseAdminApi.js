import axios from 'axios';

const ENTERPRISE_ADMIN_API_URL = 'http://localhost:7001/api/enterprise-admin';

// Helper function to get the token and create auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

// Get all users in enterprise
export const getEnterpriseUsers = () => {
    return axios.get(`${ENTERPRISE_ADMIN_API_URL}/users`, getAuthHeaders());
};

// Add user to enterprise (by email)
export const addUserToEnterprise = (email) => {
    return axios.post(`${ENTERPRISE_ADMIN_API_URL}/users`, { email }, getAuthHeaders());
};

// Update user in enterprise
export const updateEnterpriseUser = (id, userData) => {
    return axios.put(`${ENTERPRISE_ADMIN_API_URL}/users/${id}`, userData, getAuthHeaders());
};

// Deactivate user in enterprise
export const deactivateEnterpriseUser = (id) => {
    return axios.patch(`${ENTERPRISE_ADMIN_API_URL}/users/${id}/deactivate`, {}, getAuthHeaders());
};

// Delete user from enterprise
export const deleteEnterpriseUser = (id) => {
    return axios.delete(`${ENTERPRISE_ADMIN_API_URL}/users/${id}`, getAuthHeaders());
};

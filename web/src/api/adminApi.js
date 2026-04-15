// File: src/api/adminApi.js

import axios from 'axios';

const ADMIN_API_URL = 'http://localhost:7001/api/admin';

// Helper function to get the token and create auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const getUsers = () => {
    return axios.get(`${ADMIN_API_URL}/users`, getAuthHeaders());
};

export const addUser = (userData) => {
    return axios.post(`${ADMIN_API_URL}/users`, userData, getAuthHeaders());
};

export const updateUser = (id, userData) => {
    return axios.put(`${ADMIN_API_URL}/users/${id}`, userData, getAuthHeaders());
};

export const deleteUser = (id) => {
    return axios.delete(`${ADMIN_API_URL}/users/${id}`, getAuthHeaders());
};
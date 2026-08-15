import httpClient from './httpClient';

const API_URL = '/api/notifications';

export const getNotifications = () => httpClient.get(API_URL);

export const markNotificationAsRead = (id) =>
  httpClient.patch(`${API_URL}/${id}/read`);

export const markAllNotificationsAsRead = () =>
  httpClient.patch(`${API_URL}/read-all`);

export const clearNotification = (id) =>
  httpClient.patch(`${API_URL}/${id}/clear`);

export const clearAllNotifications = () =>
  httpClient.patch(`${API_URL}/clear-all`);

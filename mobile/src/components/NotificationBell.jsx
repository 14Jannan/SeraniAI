import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  clearAllNotifications,
  clearNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/notificationApi';

const iconMap = {
  course_update: 'book',
  streak_reminder: 'clock',
  payment_issue: 'credit-card',
  payment_success: 'credit-card',
  role_change: 'users',
  account_security: 'shield',
  critical: 'alert-triangle',
};

const colorMap = {
  course_update: '#3b82f6',
  streak_reminder: '#f59e0b',
  payment_issue: '#ef4444',
  payment_success: '#10b981',
  role_change: '#8b5cf6',
  account_security: '#f43f5e',
  default: '#64748b',
};

const bgColorMap = {
  course_update: '#eff6ff',
  streak_reminder: '#fffbeb',
  payment_issue: '#fef2f2',
  payment_success: '#f0fdf4',
  role_change: '#faf5ff',
  account_security: '#fff5f7',
  default: '#f8fafc',
};

const formatRelativeTime = (value) => {
  if (!value) return '';

  const createdAt = new Date(value).getTime();
  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(1, Math.round(diffMs / (60 * 1000)));

  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
};

const NotificationBell = ({ tintColor = '#000' }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
  const refreshIntervalRef = useRef(null);

  const isDark = theme === 'dark';

  // Load cleared notifications from storage
  useEffect(() => {
    const loadClearedNotifications = async () => {
      try {
        const stored = await AsyncStorage.getItem('serani-cleared-notifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setClearedNotificationIds(parsed);
          }
        }
      } catch (error) {
        console.error('Failed to load cleared notifications', error);
      }
    };

    loadClearedNotifications();
  }, []);

  // Persist cleared notifications to storage
  useEffect(() => {
    const persistClearedNotifications = async () => {
      try {
        await AsyncStorage.setItem(
          'serani-cleared-notifications',
          JSON.stringify(clearedNotificationIds)
        );
      } catch (error) {
        console.error('Failed to persist cleared notifications', error);
      }
    };

    persistClearedNotifications();
  }, [clearedNotificationIds]);

  const fetchNotifications = async () => {
    if (!user?._id) return;

    setLoading(true);
    try {
      const response = await getNotifications();
      const visibleNotifications = (response.data?.notifications || []).filter(
        (notification) => !clearedNotificationIds.includes(notification._id)
      );

      setNotifications(visibleNotifications);
      setUnreadCount(visibleNotifications.filter((notification) => !notification.readAt).length);
    } catch (error) {
      // Keep non-blocking if notifications fail
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, clearedNotificationIds]);

  // Set up polling interval
  useEffect(() => {
    if (isOpen) {
      refreshIntervalRef.current = setInterval(fetchNotifications, 60000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOpen]);

  const visibleNotifications = useMemo(
    () => (showAll ? notifications : notifications.slice(0, 5)),
    [notifications, showAll]
  );

  const handleClearNotification = async (notificationId) => {
    const wasUnread = notifications.some(
      (notification) => notification._id === notificationId && !notification.readAt
    );

    try {
      await clearNotification(notificationId);
    } catch (error) {
      // Fall back to local cleanup
      console.error('Error clearing notification:', error);
    }

    setClearedNotificationIds((previous) =>
      previous.includes(notificationId) ? previous : [...previous, notificationId]
    );
    setNotifications((previous) => previous.filter((item) => item._id !== notificationId));
    setUnreadCount((previous) => Math.max(0, previous - (wasUnread ? 1 : 0)));
  };

  const handleClearAllNotifications = async () => {
    if (!notifications.length) return;

    try {
      await clearAllNotifications();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }

    const notificationIds = notifications.map((notification) => notification._id);
    setClearedNotificationIds((previous) => [...new Set([...previous, ...notificationIds])]);
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.readAt) {
        await markNotificationAsRead(notification._id);
        setNotifications((previous) =>
          previous.map((item) =>
            item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item
          )
        );
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }

    // Handle navigation if link exists
    if (notification.link) {
      // TODO: Implement navigation logic based on your navigation setup
      // Example: navigation.navigate('ScreenName', { params })
      setIsOpen(false);
    }
  };

  const renderNotificationItem = ({ item: notification }) => {
    const icon = iconMap[notification.type] || 'bell';
    const color = colorMap[notification.type] || colorMap.default;
    const bgColor = bgColorMap[notification.type] || bgColorMap.default;
    const isRead = Boolean(notification.readAt);

    return (
      <TouchableOpacity
        onPress={() => handleNotificationClick(notification)}
        style={[
          styles.notificationItem,
          {
            backgroundColor: isRead ? (isDark ? '#1e293b' : '#ffffff') : bgColor,
          },
        ]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: bgColor,
              borderColor: color,
              opacity: isRead ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  fontWeight: isRead ? '500' : '700',
                  color: isDark ? '#e2e8f0' : '#0f172a',
                  opacity: isRead ? 0.7 : 1,
                },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text
              style={[
                styles.time,
                {
                  color: isDark ? '#94a3b8' : '#94a3b8',
                },
              ]}
            >
              {formatRelativeTime(notification.createdAt)}
            </Text>
          </View>
          <Text
            style={[
              styles.message,
              {
                color: isDark ? '#cbd5e1' : '#64748b',
                opacity: isRead ? 0.7 : 1,
              },
            ]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
        </View>

        <View style={styles.actions}>
          {!isRead && (
            <View
              style={[
                styles.unreadDot,
                {
                  backgroundColor: '#3b82f6',
                },
              ]}
            />
          )}
          <TouchableOpacity
            onPress={() => handleClearNotification(notification._id)}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="close"
              size={18}
              color={isDark ? '#94a3b8' : '#94a3b8'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const emptyState = (
    <View
      style={[
        styles.emptyContainer,
        {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
        },
      ]}
    >
      <View
        style={[
          styles.emptyIconContainer,
          {
            backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
          },
        ]}
      >
        <MaterialCommunityIcons
          name="bell"
          size={32}
          color={isDark ? '#64748b' : '#cbd5e1'}
        />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          {
            color: isDark ? '#e2e8f0' : '#0f172a',
          },
        ]}
      >
        You're all caught up
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          {
            color: isDark ? '#94a3b8' : '#94a3b8',
          },
        ]}
      >
        We will only show important updates here.
      </Text>
    </View>
  );

  return (
    <>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        style={styles.bellButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialCommunityIcons name="bell" size={24} color={tintColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modal,
              {
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
              },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                {
                  borderBottomColor: isDark ? '#334155' : '#e2e8f0',
                },
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.headerTitle,
                    {
                      color: isDark ? '#e2e8f0' : '#0f172a',
                    },
                  ]}
                >
                  Notifications
                </Text>
                <Text
                  style={[
                    styles.headerSubtitle,
                    {
                      color: isDark ? '#94a3b8' : '#64748b',
                    },
                  ]}
                >
                  Important updates only
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  onPress={handleClearAllNotifications}
                  style={styles.headerButton}
                >
                  <Text
                    style={[
                      styles.headerButtonText,
                      {
                        color: isDark ? '#94a3b8' : '#64748b',
                      },
                    ]}
                  >
                    Clear all
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleMarkAllAsRead}
                  style={styles.headerButton}
                >
                  <Text style={styles.headerButtonTextBlue}>Mark all as read</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            {loading && notifications.length === 0 ? (
              <View
                style={[
                  styles.loadingContainer,
                  {
                    backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  },
                ]}
              >
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text
                  style={[
                    styles.loadingText,
                    {
                      color: isDark ? '#94a3b8' : '#64748b',
                      marginTop: 12,
                    },
                  ]}
                >
                  Loading notifications...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              emptyState
            ) : (
              <FlatList
                data={visibleNotifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item._id}
                scrollEnabled
                nestedScrollEnabled
                style={styles.listContainer}
                contentContainerStyle={{
                  flexGrow: visibleNotifications.length === 0 ? 1 : 0,
                }}
                ListEmptyComponent={emptyState}
              />
            )}

            {/* View All Button */}
            {notifications.length > 5 && (
              <View
                style={[
                  styles.footer,
                  {
                    borderTopColor: isDark ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setShowAll(!showAll)}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllButtonText}>
                    {showAll ? 'Show less' : 'View all'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerButtonTextBlue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3b82f6',
  },
  listContainer: {
    maxHeight: 416,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 14,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  emptyContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
  },
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
});

export default NotificationBell;

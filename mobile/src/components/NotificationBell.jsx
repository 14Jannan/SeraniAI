import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  clearAllNotifications,
  clearNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/notificationApi';

const iconMap = {
  course_update: 'book-open-variant',
  streak_reminder: 'clock-outline',
  payment_issue: 'credit-card-alert-outline',
  payment_success: 'credit-card-check-outline',
  role_change: 'account-switch-outline',
  account_security: 'shield-check-outline',
  critical: 'alert-outline',
};

const colorMap = {
  course_update: '#2563eb',
  streak_reminder: '#d97706',
  payment_issue: '#dc2626',
  payment_success: '#059669',
  role_change: '#7c3aed',
  account_security: '#e11d48',
  default: '#475569',
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

const STORAGE_KEY = 'serani-cleared-notifications';

const NotificationBell = ({ tintColor = '#0f172a' }) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);
  const refreshIntervalRef = useRef(null);

  useEffect(() => {
    const loadClearedIds = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) return;

        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setClearedNotificationIds(parsed);
        }
      } catch (error) {
        console.error('Failed to load cleared notifications', error);
      }
    };

    loadClearedIds();
  }, []);

  useEffect(() => {
    const persistClearedIds = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clearedNotificationIds));
      } catch (error) {
        console.error('Failed to persist cleared notifications', error);
      }
    };

    persistClearedIds();
  }, [clearedNotificationIds]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      const visible = (response?.data?.notifications || []).filter(
        (item) => !clearedNotificationIds.includes(item._id),
      );

      setNotifications(visible);
      setUnreadCount(visible.filter((item) => !item.readAt).length);
    } catch (error) {
      // Keep bell non-blocking on failure.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    fetchNotifications();
    refreshIntervalRef.current = setInterval(fetchNotifications, 60000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isOpen, clearedNotificationIds]);

  const visibleNotifications = useMemo(
    () => (showAll ? notifications : notifications.slice(0, 5)),
    [notifications, showAll],
  );

  const handleClearNotification = async (notificationId) => {
    const wasUnread = notifications.some(
      (item) => item._id === notificationId && !item.readAt,
    );

    try {
      await clearNotification(notificationId);
    } catch (error) {
      // Fall back to local clear.
    }

    setClearedNotificationIds((previous) =>
      previous.includes(notificationId) ? previous : [...previous, notificationId],
    );
    setNotifications((previous) => previous.filter((item) => item._id !== notificationId));
    setUnreadCount((previous) => Math.max(0, previous - (wasUnread ? 1 : 0)));
  };

  const handleClearAllNotifications = async () => {
    if (!notifications.length) return;

    try {
      await clearAllNotifications();
    } catch (error) {
      // Fall back to local clear.
    }

    const ids = notifications.map((item) => item._id);
    setClearedNotificationIds((previous) => [...new Set([...previous, ...ids])]);
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (error) {
      // Keep panel usable even if mark-all fails.
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      await markNotificationAsRead(notification._id);
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item,
        ),
      );
      if (!notification.readAt) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error) {
      // Ignore read errors to keep UX smooth.
    }
  };

  const renderItem = ({ item }) => {
    const iconName = iconMap[item.type] || 'bell-outline';
    const tone = colorMap[item.type] || colorMap.default;
    const isRead = Boolean(item.readAt);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: isRead
              ? isDark
                ? '#111827'
                : '#ffffff'
              : isDark
                ? '#172033'
                : '#f8fafc',
          },
        ]}
        onPress={() => handleNotificationClick(item)}
      >
        <View style={[styles.iconWrap, { borderColor: tone }]}> 
          <MaterialCommunityIcons name={iconName} size={18} color={tone} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  color: isDark ? '#f8fafc' : '#0f172a',
                  opacity: isRead ? 0.7 : 1,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={[styles.time, { color: isDark ? '#94a3b8' : '#94a3b8' }]}>
              {formatRelativeTime(item.createdAt)}
            </Text>
          </View>

          <Text
            style={[styles.message, { color: isDark ? '#cbd5e1' : '#64748b' }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
        </View>

        <View style={styles.rightActions}>
          {!isRead ? <View style={styles.unreadDot} /> : null}
          <TouchableOpacity
            onPress={() => handleClearNotification(item._id)}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <MaterialCommunityIcons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity
        style={styles.bellButton}
        onPress={() => {
          if (!isOpen) {
            setShowAll(false);
            fetchNotifications();
          }
          setIsOpen((previous) => !previous);
        }}
      >
        <MaterialCommunityIcons name="bell-outline" size={24} color={tintColor} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity style={styles.overlay} onPress={() => setIsOpen(false)} activeOpacity={1}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(event) => event.stopPropagation()}
            style={[
              styles.panel,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: isDark ? '#243047' : '#e2e8f0',
              },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: isDark ? '#243047' : '#e2e8f0' }]}> 
              <View>
                <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>Notifications</Text>
                <Text style={[styles.headerSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>Important updates only</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={handleClearAllNotifications}>
                  <Text style={[styles.headerActionMuted, { color: isDark ? '#cbd5e1' : '#475569' }]}>Clear all</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleMarkAllAsRead}>
                  <Text style={styles.headerActionPrimary}>Mark all as read</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading && notifications.length === 0 ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={[styles.loadingText, { color: isDark ? '#94a3b8' : '#64748b' }]}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="bell-sleep-outline" size={28} color="#94a3b8" />
                <Text style={[styles.emptyTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>You're all caught up</Text>
                <Text style={[styles.emptySub, { color: isDark ? '#94a3b8' : '#64748b' }]}>We will only show important updates here.</Text>
              </View>
            ) : (
              <FlatList
                data={visibleNotifications}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                style={styles.list}
              />
            )}

            {notifications.length > 5 ? (
              <View style={[styles.footer, { borderTopColor: isDark ? '#243047' : '#e2e8f0' }]}> 
                <TouchableOpacity onPress={() => setShowAll((previous) => !previous)}>
                  <Text style={styles.footerText}>{showAll ? 'Show less' : 'View all'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bellButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    backgroundColor: '#ef4444',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-start',
    paddingTop: 84,
    paddingHorizontal: 12,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: 500,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  headerActionMuted: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerActionPrimary: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 34,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  list: {
    maxHeight: 420,
  },
  notificationItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 11,
  },
  message: {
    fontSize: 12,
    marginTop: 4,
  },
  rightActions: {
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    marginTop: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
});

export default NotificationBell;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiBook,
  FiClock,
  FiCreditCard,
  FiShield,
  FiUsers,
  FiAlertTriangle,
  FiX,
} from 'react-icons/fi';
import {
  clearAllNotifications,
  clearNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../api/notificationApi';

const iconMap = {
  course_update: FiBook,
  streak_reminder: FiClock,
  payment_issue: FiCreditCard,
  payment_success: FiCreditCard,
  role_change: FiUsers,
  account_security: FiShield,
  critical: FiAlertTriangle,
};

const colorMap = {
  course_update: 'bg-blue-50 text-blue-600 border-blue-100',
  streak_reminder: 'bg-amber-50 text-amber-600 border-amber-100',
  payment_issue: 'bg-red-50 text-red-600 border-red-100',
  payment_success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  role_change: 'bg-violet-50 text-violet-600 border-violet-100',
  account_security: 'bg-rose-50 text-rose-600 border-rose-100',
  default: 'bg-slate-50 text-slate-600 border-slate-100',
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

const NotificationBell = ({ className = '', variant = 'floating', panelAlign = 'right' }) => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [clearedNotificationIds, setClearedNotificationIds] = useState([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('serani-cleared-notifications');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setClearedNotificationIds(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load cleared notifications', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('serani-cleared-notifications', JSON.stringify(clearedNotificationIds));
  }, [clearedNotificationIds]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      const visibleNotifications = (response.data?.notifications || []).filter(
        (notification) => !clearedNotificationIds.includes(notification._id),
      );

      setNotifications(visibleNotifications);
      setUnreadCount(visibleNotifications.filter((notification) => !notification.readAt).length);
    } catch (error) {
      // Keep the bell non-blocking if notifications fail.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const intervalId = window.setInterval(fetchNotifications, 20000);
    const handleRefresh = () => fetchNotifications();

    window.addEventListener('serani:refresh-notifications', handleRefresh);
    window.addEventListener('focus', handleRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('serani:refresh-notifications', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, [clearedNotificationIds]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const visibleNotifications = useMemo(
    () => (showAll ? notifications : notifications.slice(0, 5)),
    [notifications, showAll],
  );

  const handleClearNotification = async (notificationId) => {
    const wasUnread = notifications.some(
      (notification) => notification._id === notificationId && !notification.readAt,
    );

    try {
      await clearNotification(notificationId);
    } catch (error) {
      // Fall back to local cleanup if the API is unavailable.
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
      // Fall back to local cleanup if the API is unavailable.
    }

    const notificationIds = notifications.map((notification) => notification._id);
    setClearedNotificationIds((previous) => [...new Set([...previous, ...notificationIds])]);
    setNotifications([]);
    setUnreadCount(0);
  };

  const handleOpen = () => {
    setIsOpen((previous) => !previous);
    if (!isOpen) {
      setShowAll(false);
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      await markNotificationAsRead(notification._id);
      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notification._id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      // Ignore read-state errors to keep navigation smooth.
    }

    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      );
      setUnreadCount(0);
    } catch (error) {
      // Keep the panel usable even if mark-all fails.
    }
  };

  const isSidebar = variant === 'sidebar';

  return (
    <div ref={panelRef} className={`relative z-40 ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        className={
          isSidebar
            ? 'relative flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20'
            : 'relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl'
        }
        aria-label="Notifications"
      >
        <FiBell className="text-lg" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          className={`absolute top-full mt-3 w-[22rem] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${
            panelAlign === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-xs text-slate-500">Important updates only</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAllNotifications}
                className="text-xs font-medium text-slate-600 transition hover:text-slate-800"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-blue-600 transition hover:text-blue-700"
              >
                Mark all as read
              </button>
            </div>
          </div>

          <div className="max-h-[26rem] divide-y divide-slate-100 overflow-y-auto">
            {loading && !notifications.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FiBell className="text-xl" />
                </div>
                <p className="text-sm font-medium text-slate-900">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-slate-500">We will only show important updates here.</p>
              </div>
            ) : (
              visibleNotifications.map((notification) => {
                const Icon = iconMap[notification.type] || FiBell;
                const isRead = Boolean(notification.readAt);
                const tone = colorMap[notification.type] || colorMap.default;

                return (
                  <div
                    key={notification._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50 ${
                      isRead ? 'bg-white opacity-70' : 'bg-rose-50/50'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${tone}`}>
                      <Icon className="text-base" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={`block text-sm ${isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">{notification.message}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      {!isRead ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-500" /> : <span className="mt-2 h-2.5 w-2.5 rounded-full bg-transparent" />}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleClearNotification(notification._id);
                        }}
                        className="mt-1 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Clear notification"
                      >
                        <FiX className="text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 5 ? (
            <div className="border-t border-slate-100 px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => setShowAll((previous) => !previous)}
                className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              >
                {showAll ? 'Show less' : 'View all'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default NotificationBell;
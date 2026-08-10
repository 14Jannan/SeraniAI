import React, { useEffect, useState, useRef } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { getUserSubscription } from '../api/subscriptionApi'
import { getCurrentUser } from '../api/authApi'
import {
  clearAuthSession,
  getAuthStorageMode,
  getStoredUser,
  saveAuthSession,
} from '../utils/authStorage'
import {
  FiLogOut,
  FiHome,
  FiMessageSquare,
  FiBook,
  FiGrid,
  FiCheckSquare,
  FiUsers,
  FiCreditCard,
  FiChevronDown,
} from 'react-icons/fi'
import NotificationBell from '../components/NotificationBell'

const UserLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getStoredUser() || { name: 'User' });
  const [subscription, setSubscription] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const isDark = theme === 'dark';

  const roleToPlanLabel = (role, fallbackPlan) => {
    const roleLabelMap = {
      '(Pro)PlanUser': 'Pro Plan User',
      enterpriseUser: 'Enterprise User',
      enterpriseAdmin: 'Enterprise Admin',
      admin: 'Admin',
      user: 'Free',
    };

    return roleLabelMap[role] || fallbackPlan || 'Free';
  };

  useEffect(() => {
    const handleUserUpdated = (event) => {
      if (event?.detail) {
        setUser((prev) => ({ ...prev, ...event.detail }));
      }
    };

    window.addEventListener('serani:user-updated', handleUserUpdated);
    return () => window.removeEventListener('serani:user-updated', handleUserUpdated);
  }, []);

  useEffect(() => {
    const fetchProfileAndSubscription = async () => {
      try {
        const [userResponse, subscriptionResponse] = await Promise.allSettled([
          getCurrentUser(),
          getUserSubscription(),
        ]);

        if (userResponse.status === 'fulfilled' && userResponse.value?.data) {
          const freshUser = userResponse.value.data;
          const storedUser = getStoredUser() || {};
          const mergedUser = {
            ...storedUser,
            ...freshUser,
            profileImage: storedUser.profileImage || freshUser.profileImage || '',
          };

          setUser(mergedUser);
          saveAuthSession({
            user: mergedUser,
            rememberMe: getAuthStorageMode() === 'localStorage',
          });
        }

        if (
          subscriptionResponse.status === 'fulfilled' &&
          subscriptionResponse.value?.data?.status === 'Active'
        ) {
          setSubscription(subscriptionResponse.value.data);
        }
      } catch (err) {
        console.log('Unable to refresh user profile and subscription');
      }
    };

    fetchProfileAndSubscription();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login');
  };

  const handleSubscriptionAction = () => {
    navigate('/subscription');
  };

  const getSubscriptionAction = () => {
    if (user?.role === 'enterpriseUser') {
      return { type: 'managed' };
    }

    if (user?.role === 'enterpriseAdmin') {
      return { type: 'button', label: 'Manage' };
    }

    if (subscription?.status === 'Active') {
      return { type: 'button', label: 'Manage' };
    }

    return { type: 'button', label: 'Upgrade' };
  };

  const subscriptionAction = getSubscriptionAction();

  const menuItems = [
    { name: 'Home', icon: <FiHome />, path: '/dashboard' },
    { name: 'AI Chat', icon: <FiMessageSquare />, path: '/dashboard/chat' },
    { name: 'Journal', icon: <FiBook />, path: '/dashboard/journal' },
    { name: 'Courses', icon: <FiGrid />, path: '/dashboard/courses' },
    { name: 'Daily Tasks', icon: <FiCheckSquare />, path: '/dashboard/tasks' },
    { name: 'Subscription', icon: <FiCreditCard />, path: '/subscription' },
    ...(user?.role === 'enterpriseAdmin'
      ? [
          {
            name: 'Enterprise Manager',
            icon: <FiUsers />,
            path: '/dashboard/enterprise-manager',
          },
        ]
      : []),
  ];

  return (
    <div className={`
      flex h-screen font-sans transition-colors duration-300
      ${isDark ? 'bg-[#0F172A]' : 'bg-[#f0f9ff]'}
    `}>

      {/* Sidebar */}
      <aside className={`
        w-64 flex-shrink-0 flex flex-col justify-between transition-colors duration-300
        ${isDark
          ? 'bg-[#111827]'
          : 'bg-[#1e1b4b]'
        }
      `}>

        {/* Header */}
        <div className="p-6">
          <h1 className="text-3xl font-bold text-white mb-10 tracking-wide">
            SeraniAI
          </h1>

          <nav className="space-y-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/dashboard'}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : isDark
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Panel */}
        <div className="p-6 space-y-6">

          {/* Theme Toggle */}
          <div className={`
            rounded-full p-1 flex transition-colors
            ${isDark ? 'bg-white/10' : 'bg-black/20'}
          `}>
            <button
              onClick={() => toggleTheme('light')}
              className={`
                flex-1 text-xs font-bold py-1.5 rounded-full transition-all
                ${theme === 'light'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-white/60 hover:text-white'
                }
              `}
            >
              Light
            </button>

            <button
              onClick={() => toggleTheme('dark')}
              className={`
                flex-1 text-xs font-bold py-1.5 rounded-full transition-all
                ${theme === 'dark'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-white/60 hover:text-white'
                }
              `}
            >
              Dark
            </button>
          </div>

          {/* User + Subscription */}
          <div className="border-t border-white/20 pt-4">
            <div className="relative" ref={profileMenuRef}>
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  className="w-12 h-12 rounded-full bg-blue-500 overflow-hidden flex items-center justify-center font-bold text-white border-2 border-white/20 transition hover:bg-blue-400"
                >
                  {user?.profileImage ? (
                    <img
                      src={user.profileImage}
                      alt={`${user.name || 'User'} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user.name ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </button>

                <div className="flex-1 min-w-0 text-white">
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs text-white/70">{roleToPlanLabel(user?.role, subscription?.plan)}</p>
                </div>

                <button
                  onClick={handleSubscriptionAction}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                >
                  {subscriptionAction.label || 'Upgrade'}
                </button>
              </div>

              {showProfileMenu && (
                <div className={`absolute inset-x-0 bottom-full mb-3 rounded-2xl shadow-2xl border overflow-hidden z-20 transition-colors duration-300 ${
                  isDark
                    ? 'bg-[#0f172a] border-slate-700 text-white'
                    : 'bg-white border-gray-200 text-gray-900'
                }`}>
                  <button
                    onClick={() => {
                      navigate('/dashboard/settings');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium text-inherit">Settings</div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Profile & preferences</div>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/subscription');
                      setShowProfileMenu(false);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium text-inherit">Upgrade to Pro</div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Unlock premium features</div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-400 transition hover:text-red-300"
            >
              <FiLogOut />
              Logout
            </button>

            {subscriptionAction.type === 'managed' && (
              <p className="text-xs text-white/60 mt-3">
                Subscription managed by your enterprise admin.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex justify-end">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;

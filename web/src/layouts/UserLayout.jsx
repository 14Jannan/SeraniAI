import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { getUserSubscription } from '../api/subscriptionApi'
import { getCurrentUser } from '../api/authApi'
import {
  FiLogOut,
  FiHome,
  FiMessageSquare,
  FiBook,
  FiGrid,
  FiCheckSquare,
  FiUsers,
} from 'react-icons/fi'

const UserLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [user, setUser] = useState({ name: 'User' });
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';
  const isEnterpriseScopedUser =
    user?.role === 'enterpriseUser' || user?.role === 'enterpriseAdmin';

  const roleToPlanLabel = (role, fallbackPlan) => {
    const roleLabelMap = {
      '(Go)PlanUser': 'Go Plan User',
      '(Plus)PlanUser': 'Plus Plan User',
      '(Pro)PlanUser': 'Pro Plan User',
      enterpriseUser: 'Enterprise User',
      enterpriseAdmin: 'Enterprise Admin',
      admin: 'Admin',
      user: 'Free',
    };

    return roleLabelMap[role] || fallbackPlan || 'Free';
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) setUser(JSON.parse(userData));
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
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        }

        if (
          subscriptionResponse.status === 'fulfilled' &&
          subscriptionResponse.value?.data?.status === 'Active'
        ) {
          setSubscription(subscriptionResponse.value.data);
        }
      } catch (err) {
        console.log('Unable to refresh user profile and subscription');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndSubscription();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const menuItems = [
    { name: 'Home', icon: <FiHome />, path: '/dashboard' },
    { name: 'AI Chat', icon: <FiMessageSquare />, path: '/dashboard/chat' },
    { name: 'Journal', icon: <FiBook />, path: '/dashboard/journal' },
    { name: 'Courses', icon: <FiGrid />, path: '/dashboard/courses' },
    { name: 'Daily Tasks', icon: <FiCheckSquare />, path: '/dashboard/tasks' },
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

            <div className="flex items-center gap-3 text-white mb-3">

              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold border-2 border-white/20">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user.name}
                </p>
                <p className="text-xs text-white/70">
                  {roleToPlanLabel(user?.role, subscription?.plan)}
                </p>
              </div>

              {!subscription && !isEnterpriseScopedUser && (
                <button
                  onClick={handleUpgrade}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-gray-900 hover:bg-gray-100 transition"
                >
                  Upgrade
                </button>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/80 hover:text-white text-sm w-full"
            >
              <FiLogOut />
              Logout
            </button>

          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default UserLayout;

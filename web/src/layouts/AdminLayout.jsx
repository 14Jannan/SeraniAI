import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  FiUsers,
  FiLogOut,
  FiSun,
  FiMoon,
  FiBook,
  FiCreditCard,
  FiCheckSquare
} from 'react-icons/fi';

const AdminLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300
      ${isDark ? 'bg-gray-900' : 'bg-gray-100'}
    `}>

      {/* Sidebar */}
      <aside className={`
        w-64 flex-shrink-0 flex flex-col shadow-xl transition-colors duration-300
        ${isDark
          ? 'bg-[#0f172a] border-r border-gray-800'
          : 'bg-[#1e1b4b]'
        }
      `}>

        {/* Logo */}
        <div className={`
          h-16 flex items-center justify-center border-b transition-colors duration-300
          ${isDark ? 'border-gray-700' : 'border-white/10'}
        `}>
          <h1 className="text-2xl font-bold text-white">
            Serani Admin
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">

          <Link
            to="/admin/users"
            className={`
              flex items-center px-4 py-2 rounded-md transition-colors
              ${isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            <FiUsers className="mr-3" />
            Users
          </Link>

          <Link
            to="/admin/courses"
            className={`
              flex items-center px-4 py-2 rounded-md transition-colors
              ${isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            <FiBook className="mr-3" />
            Courses
          </Link>

          <Link
            to="/admin/tasks"
            className={`
              flex items-center px-4 py-2 rounded-md transition-colors
              ${isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            <FiCheckSquare className="mr-3" />
            Tasks
          </Link>

          <Link
            to="/admin/subscriptions"
            className={`
              flex items-center px-4 py-2 rounded-md transition-colors
              ${isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            <FiCreditCard className="mr-3" />
            Subscriptions
          </Link>
        </nav>

        {/* Bottom */}
        <div className={`
          px-4 py-4 border-t transition-colors duration-300
          ${isDark ? 'border-gray-700' : 'border-white/10'}
        `}>

          {/* Theme Toggle */}
          <button
            onClick={() => toggleTheme(isDark ? 'light' : 'dark')}
            className={`
              flex items-center w-full px-4 py-2 rounded-md mb-2 transition-colors
              ${isDark
                ? 'text-gray-300 hover:bg-gray-700'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
              }
            `}
          >
            {isDark ? <FiSun className="mr-3" /> : <FiMoon className="mr-3" />}
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="
              flex items-center w-full px-4 py-2 text-red-400 rounded-md
              hover:bg-red-500/10 hover:text-red-300 transition-colors
            "
          >
            <FiLogOut className="mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
};

export default AdminLayout;

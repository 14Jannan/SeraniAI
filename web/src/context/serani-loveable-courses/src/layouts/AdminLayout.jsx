import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { FiUsers, FiLogOut, FiSun, FiMoon } from 'react-icons/fi';

const AdminLayout = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 font-sans`}>
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-[#0d1a2e] border-r dark:border-gray-700 flex flex-col">
        <div className="h-16 flex items-center justify-center border-b dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Serani Admin</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link to="/admin/users" className="flex items-center px-4 py-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
            <FiUsers className="mr-3" />
            Users
          </Link>
        </nav>
        <div className="px-4 py-4 border-t dark:border-gray-700">
           {/* Theme Toggle */}
           <button onClick={() => toggleTheme(theme === 'light' ? 'dark' : 'light')} className="flex items-center w-full px-4 py-2 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 mb-2">
             {theme === 'light' ? <FiMoon className="mr-3"/> : <FiSun className="mr-3"/>}
             {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
           </button>
           <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-red-500 rounded-md hover:bg-red-100 dark:hover:bg-red-500/20">
             <FiLogOut className="mr-3" />
             Logout
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet /> {/* This renders the current page, e.g., AdminUsers */}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser } from '../../api/authApi';
import { Sun, Moon, User, Save, LogOut } from 'lucide-react';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getCurrentUser();
        if (response?.data) {
          setUser(response.data);
          setFormData({
            firstName: response.data.firstName || '',
            lastName: response.data.lastName || '',
            email: response.data.email || '',
            phone: response.data.phone || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // TODO: Call API to update user profile
      // For now, just show success message
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Failed to save profile');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-8 transition-colors ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Manage your account preferences and profile information
          </p>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${saveMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {saveMessage}
          </div>
        )}

        {/* Appearance Section */}
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Sun size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold">Appearance</h2>
          </div>

          <div className="space-y-4">
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Theme
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => toggleTheme('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Sun size={18} />
                Light Mode
              </button>
              <button
                onClick={() => toggleTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : isDark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Moon size={18} />
                Dark Mode
              </button>
            </div>
          </div>
        </div>

        {/* Profile Section */}
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <User size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold">User Profile</h2>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="First Name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-gray-400'
                    : 'bg-gray-100 border-gray-300 text-gray-600'
                }`}
                placeholder="Email"
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Phone Number"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        {/* Important Settings Section */}
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-xl font-bold mb-6">Important Settings</h2>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}>
              <h3 className="font-semibold mb-2">Two-Factor Authentication</h3>
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Add an extra layer of security to your account
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                Enable 2FA
              </button>
            </div>

            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}>
              <h3 className="font-semibold mb-2">Data & Privacy</h3>
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your data and privacy preferences
              </p>
              <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
                View Privacy Settings
              </button>
            </div>

            <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}>
              <h3 className="font-semibold mb-2">Account Sessions</h3>
              <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Manage your active sessions and devices
              </p>
              <button className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">
                Manage Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className={`p-6 rounded-lg border ${isDark ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
          <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">Danger Zone</h2>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;

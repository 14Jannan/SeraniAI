import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { getCurrentUser, deleteCurrentUser, updateProfile } from '../../api/authApi';
import { getUserSubscription } from '../../api/subscriptionApi';
import { Sun, Moon, User, Save, LogOut, CreditCard, ChevronRight, Upload } from 'lucide-react';
import {
  clearAuthSession,
  getAuthStorageMode,
  getStoredUser,
  saveAuthSession,
} from '../../utils/authStorage';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const profileImageInputRef = useRef(null);

  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [formData, setFormData] = useState({
    displayName: getStoredUser()?.name || '',
    profileImage: getStoredUser()?.profileImage || '',
    goals: getStoredUser()?.preferences?.goals || '',
    profession: getStoredUser()?.preferences?.profession || '',
    communicationStyle: getStoredUser()?.preferences?.communicationStyle || 'Professional',
    knowledgeLevel: getStoredUser()?.preferences?.knowledgeLevel || 'Beginner',
    currentFocus: getStoredUser()?.preferences?.currentFocus || '',
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getCurrentUser();
        if (response?.data) {
          const storedUser = getStoredUser() || {};
          const mergedUser = {
            ...storedUser,
            ...response.data,
            profileImage: storedUser.profileImage || response.data.profileImage || '',
          };

          setUser(mergedUser);
          setFormData({
            displayName: mergedUser.name || '',
            profileImage: mergedUser.profileImage || '',
            goals: mergedUser.preferences?.goals || '',
            profession: mergedUser.preferences?.profession || '',
            communicationStyle: mergedUser.preferences?.communicationStyle || 'Professional',
            knowledgeLevel: mergedUser.preferences?.knowledgeLevel || 'Beginner',
            currentFocus: mergedUser.preferences?.currentFocus || '',
          });

          saveAuthSession({
            user: mergedUser,
            rememberMe: getAuthStorageMode() === 'localStorage',
          });
        }

        // Fetch subscription data
        try {
          const subResponse = await getUserSubscription();
          setSubscription(subResponse.data);
        } catch (error) {
          console.error('Failed to fetch subscription:', error);
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

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please choose an image file.');
      setTimeout(() => setSaveMessage(''), 3000);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        profileImage: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const trimmedDisplayName = formData.displayName.trim();

      if (!trimmedDisplayName) {
        setSaveMessage('Display name is required.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      const updateData = {
        name: trimmedDisplayName,
        profileImage: formData.profileImage || '',
        preferences: {
          goals: formData.goals,
          profession: formData.profession,
          communicationStyle: formData.communicationStyle,
          knowledgeLevel: formData.knowledgeLevel,
          currentFocus: formData.currentFocus,
        }
      };

      const response = await updateProfile(updateData);
      const updatedUser = { ...(user || {}), ...response.data.user, profileImage: updateData.profileImage };

      setUser(updatedUser);
      setFormData({
        displayName: updatedUser.name || '',
        profileImage: updatedUser.profileImage || '',
        goals: updatedUser.preferences?.goals || '',
        profession: updatedUser.preferences?.profession || '',
        communicationStyle: updatedUser.preferences?.communicationStyle || 'Professional',
        knowledgeLevel: updatedUser.preferences?.knowledgeLevel || 'Beginner',
        currentFocus: updatedUser.preferences?.currentFocus || '',
      });

      saveAuthSession({
        user: updatedUser,
        rememberMe: getAuthStorageMode() === 'localStorage',
      });

      window.dispatchEvent(
        new CustomEvent('serani:user-updated', { detail: updatedUser }),
      );

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
    clearAuthSession();
    // Redirect to login page
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    setDeleteError('');

    try {
      await deleteCurrentUser();
      clearAuthSession();
      navigate('/login');
    } catch (error) {
      setDeleteError(
        error?.response?.data?.message || 'Unable to delete account. Please try again.',
      );
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const historyEntries = subscription
    ? subscription.transactionHistory && subscription.transactionHistory.length > 0
      ? subscription.transactionHistory
      : [
          {
            date: subscription.lastCharged || subscription.createdAt || new Date(),
            amount: subscription.amount || 0,
            status:
              subscription.payHereStatus === 'ACTIVE' || subscription.status === 'Active'
                ? 'Paid'
                : subscription.status || 'Pending',
            description: `${subscription.plan || 'Subscription'} charge`,
          },
        ]
    : [];

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
            <div className={`flex flex-col gap-4 rounded-2xl border border-dashed p-4 ${isDark ? 'border-gray-600 bg-gray-900/40' : 'border-gray-300 bg-gray-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`h-20 w-20 overflow-hidden rounded-2xl border ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-100'}`}>
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className={`flex h-full w-full items-center justify-center text-xl font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formData.displayName ? formData.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <p className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Profile image</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Upload an image to use across your profile.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => profileImageInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  <Upload size={18} />
                  Change image
                </button>

                {formData.profileImage && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, profileImage: '' }))}
                    className={`px-4 py-2 rounded-lg border transition ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                  >
                    Remove image
                  </button>
                )}

                <input
                  ref={profileImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Display Name"
              />
            </div>

            <div className={`rounded-lg border px-4 py-3 text-sm ${isDark ? 'border-gray-700 bg-gray-900/40 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
              Manage your profile and personalization settings below.
            </div>
          </div>
        </div>

        {/* Personalization Section */}
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
              <User size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold">AI Personalization</h2>
          </div>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Primary Goals
              </label>
              <input
                type="text"
                name="goals"
                value={formData.goals}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="e.g. Learn React, Prepare for Interviews"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Study / Work
              </label>
              <input
                type="text"
                name="profession"
                value={formData.profession}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="e.g. IT Student, Software Engineer"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Communication Style
              </label>
              <select
                name="communicationStyle"
                value={formData.communicationStyle}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="Professional">Professional & Formal</option>
                <option value="Friendly">Friendly & Supportive</option>
                <option value="Simple">Simple English & Short Explanations</option>
                <option value="Direct">Direct & Code-heavy</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Knowledge Level
              </label>
              <select
                name="knowledgeLevel"
                value={formData.knowledgeLevel}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Current Focus Area
              </label>
              <input
                type="text"
                name="currentFocus"
                value={formData.currentFocus}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="e.g. Debugging a Node API"
              />
            </div>
          </div>

          <div className="flex justify-end border-t pt-6 dark:border-gray-700">
            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </div>

        {/* Billing Section */}
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <CreditCard size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold">Billing</h2>
          </div>

          <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} border`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {subscription?.plan === "Personal" ? "Pro Plan" : subscription?.plan === "Business" ? "Business Plan" : "Free Plan"}
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Intelligence for everyday tasks
                </p>
              </div>
              <button
                onClick={() => navigate('/subscription')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Upgrade
              </button>
            </div>
          </div>

          <h3 className="font-semibold mb-4 text-base">Billing history</h3>
          <div className={`rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {historyEntries.length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {historyEntries.map((transaction, idx) => {
                  const amountDisplay = Number.isFinite(Number(transaction.amount))
                    ? Number(transaction.amount).toFixed(2)
                    : String(transaction.amount || '0.00');

                  return (
                    <div key={idx} className={`p-4 flex items-center justify-between ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition`}>
                      <div className="flex-1">
                        <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                          {new Date(transaction.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {transaction.description || 'Subscription charge'}
                        </div>
                      </div>
                      <div className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                        LKR {amountDisplay}
                      </div>
                      <div className="ml-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.status === 'Paid' || transaction.status === 'paid'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {transaction.status || 'Paid'}
                        </span>
                      </div>
                      <button className={`ml-4 text-sm font-medium ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                No billing history yet
              </div>
            )}
          </div>
        </div>

        {/* Account Section */}
        <div className={`mb-8 p-6 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className="text-xl font-bold mb-6">Account</h2>

          <div className={`space-y-4 p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            {/* Name */}
            <div className="flex items-center justify-between py-3 border-b border-gray-300 dark:border-gray-600 last:border-b-0">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Name</span>
              <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {formData.displayName || user?.name || 'Not set'}
              </span>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-3 border-b border-gray-300 dark:border-gray-600 last:border-b-0">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</span>
              <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {user?.email || 'Not set'}
              </span>
            </div>

            {/* Delete Account */}
            <div className="flex items-center justify-between py-3">
              <span className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>Delete account</span>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
            <div className={`p-6 rounded-lg max-w-sm w-full mx-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className="text-lg font-bold mb-4">Delete Account</h3>
              <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeletingAccount ? 'Deleting...' : 'Delete'}
                </button>
              </div>
              {deleteError && (
                <p className="mt-4 text-sm text-red-500">{deleteError}</p>
              )}
            </div>
          </div>
        )}

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

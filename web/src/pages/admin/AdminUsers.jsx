import React, { useState, useEffect } from "react";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import { getUsers, addUser, updateUser, deleteUser } from "../../api/adminApi";
import Modal from "../../components/Modal";
import { useForm } from "react-hook-form";
import { useFetchUSers } from "../../hooks/useFetch";
import { queryClient } from "../../main";

const ROLE_CONFIG = {
  user: {
    label: "User",
    badgeClass:
      "border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-500 dark:bg-sky-500/10 dark:text-sky-200",
  },
  admin: {
    label: "Admin",
    badgeClass:
      "border-rose-500 bg-rose-50 text-rose-700 dark:border-rose-400 dark:bg-rose-500/10 dark:text-rose-200",
  },
  enterpriseUser: {
    label: "Enterprise User",
    badgeClass:
      "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-200",
  },
  enterpriseAdmin: {
    label: "Enterprise Admin",
    badgeClass:
      "border-violet-500 bg-violet-50 text-violet-700 dark:border-violet-400 dark:bg-violet-500/10 dark:text-violet-200",
  },
  "(Pro)PlanUser": {
    label: "Pro Plan User",
    badgeClass:
      "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400 dark:bg-fuchsia-500/10 dark:text-fuchsia-200",
  },
};

const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
  { value: "enterpriseUser", label: "Enterprise User" },
  { value: "enterpriseAdmin", label: "Enterprise Admin" },
  { value: "(Pro)PlanUser", label: "Pro Plan User" },
];

const getRoleConfig = (role) =>
  ROLE_CONFIG[role] || {
    label: role,
    badgeClass:
      "border-slate-400 bg-slate-50 text-slate-700 dark:border-slate-500 dark:bg-slate-500/10 dark:text-slate-200",
  };

const formFieldClassName =
  "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500";

const AdminUsers = () => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // null for 'add', user object for 'edit'

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  });
  const { register, handleSubmit: handleSubmitForm, reset } = useForm();

  const { data, isError: error, isLoading: loading } = useFetchUSers();
  const users = data?.data || [];
  const handleOpenModal = (user = null) => {
    setCurrentUser(user);
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role === "enterprise" ? "enterpriseUser" : user.role,
      });
    } else {
      setFormData({ name: "", email: "", password: "", role: "user" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const normalizedRole =
        formData.role === "enterprise" ? "enterpriseUser" : formData.role;

      if (currentUser) {
        // Update user
        const dataToUpdate = { ...formData, role: normalizedRole };
        if (!dataToUpdate.password) delete dataToUpdate.password; // Don't send empty password
        await updateUser(currentUser._id, dataToUpdate);
      } else {
        // Add new user
        await addUser({ ...formData, role: normalizedRole });
      }
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      // Refresh list
      handleCloseModal();
    } catch (err) {
      setError(err.response?.data?.message || "Operation failed.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id);
        await queryClient.invalidateQueries({ queryKey: ["users"] });
      } catch {
        setError("Failed to delete user.");
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          User Management
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          <FiPlus /> Add User
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      <div className="bg-white dark:bg-[#0d1a2e] p-4 rounded-lg shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Name
                </th>
                <th scope="col" className="px-6 py-3">
                  Email
                </th>
                <th scope="col" className="px-6 py-3">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const displayRole =
                    user.role === "enterprise" ? "enterpriseUser" : user.role;

                  return (
                    <tr
                      key={user._id}
                      className="bg-white dark:bg-[#0d1a2e] border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        {(() => {
                          const roleConfig = getRoleConfig(displayRole);

                          return (
                            <span
                              className={`inline-flex items-center rounded-full border-2 px-3 py-1 text-xs font-semibold ${roleConfig.badgeClass}`}
                            >
                              {roleConfig.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-4">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentUser ? "Edit User" : "Add New User"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              {...register("name", { required: true })}
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className={formFieldClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              {...register("email", { required: true })}
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={formFieldClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              {...register("password", { required: !currentUser })}
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={currentUser ? "Leave blank to keep same" : ""}
              required={!currentUser}
              className={formFieldClassName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Role
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className={formFieldClassName}
            >
              {ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminUsers;

import React, { useState, useEffect } from "react";
import { FiEdit, FiTrash2, FiPlus } from "react-icons/fi";
import {
  getEnterpriseUsers,
  addUserToEnterprise,
  updateEnterpriseUser,
  deleteEnterpriseUser,
  revokeEnterpriseInvite,
} from "../../../api/enterpriseAdminApi";
import Modal from "../../../components/Modal";
import ConfirmModal from "../../../components/ConfirmModal";

/* Enterprise admin management component for handling users and invitations */
const EnterpriseAdmin = () => {
  /* State management for users list and enterprise data */
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  /* Seat usage tracking */
  const [seatSummary, setSeatSummary] = useState({
    seatLimit: 1,
    seatsUsed: 0,
    seatsRemaining: 1,
  });

  /* Modal and form state management */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const [inviteToStop, setInviteToStop] = useState(null);
  const [isStoppingInvite, setIsStoppingInvite] = useState(false);

  /* Form state for adding and editing users */
  const [addFormData, setAddFormData] = useState({ email: "" });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    status: "active",
  });

  /* Load enterprise users on component mount */
  useEffect(() => {
    fetchUsers();
  }, []);

  /* Fetch all enterprise users and invites with seat information */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getEnterpriseUsers();
      setUsers(res.data?.users || []);
      setInvites(res.data?.invites || []);
      setSeatSummary({
        seatLimit: res.data?.seatLimit || 1,
        seatsUsed: res.data?.seatsUsed || 0,
        seatsRemaining: res.data?.seatsRemaining || 0,
      });
      setError("");
    } catch (err) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  /* Open add user modal with seat availability check */
  // Add User Modal Handlers
  const handleOpenAddModal = () => {
    if (seatSummary.seatsUsed >= seatSummary.seatLimit) {
      setError(`Seat limit reached. You have used ${seatSummary.seatsUsed} of ${seatSummary.seatLimit} seats.`);
      return;
    }

    setAddFormData({ email: "" });
    setIsAddModalOpen(true);
  };

  /* Close add user modal and reset form */
  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setAddFormData({ email: "" });
  };

  /* Handle form input changes for add user form */
  const handleAddChange = (e) => {
    setAddFormData({ ...addFormData, [e.target.name]: e.target.value });
  };

  /* Submit add user form and invite to enterprise */
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await addUserToEnterprise(addFormData.email);
      fetchUsers();
      handleCloseAddModal();
      setError("");
      setNotice(response.data?.message || "Invitation sent successfully.");
    } catch (err) {
      setNotice("");
      setError(err.response?.data?.message || "Failed to add user.");
    }
  };

  /* Edit User Modal Handlers - Open modal with selected user data */
  const handleOpenEditModal = (user) => {
    setCurrentUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  /* Close edit modal and clear selected user */
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentUser(null);
  };

  /* Handle form input changes for edit user form */
  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  /* Submit edit user form and update user information */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateEnterpriseUser(currentUser._id, editFormData);
      fetchUsers();
      handleCloseEditModal();
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user.");
    }
  };

  /* Delete user from enterprise after modal confirmation */
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || isRemovingMember) return;
    try {
      setIsRemovingMember(true);
      await deleteEnterpriseUser(memberToRemove._id);
      fetchUsers();
      setError("");
      setNotice("");
      setMemberToRemove(null);
    } catch (err) {
      setNotice("");
      setError(err.response?.data?.message || "Failed to remove user.");
    } finally {
      setIsRemovingMember(false);
    }
  };

  /* Revoke pending invitation after modal confirmation */
  const handleConfirmStopInvite = async () => {
    if (!inviteToStop || isStoppingInvite) return;
    try {
      setIsStoppingInvite(true);
      const response = await revokeEnterpriseInvite(inviteToStop.id);
      setError("");
      setNotice(response.data?.message || "Invite stopped successfully.");
      fetchUsers();
      setInviteToStop(null);
    } catch (err) {
      setNotice("");
      setError(err.response?.data?.message || "Failed to stop invite.");
    } finally {
      setIsStoppingInvite(false);
    }
  };

  /* Filter out accepted invites to show only pending ones */
  const visibleInvites = invites.filter((invite) => invite.status !== "accepted");

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Enterprise Manager
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Seats used: {seatSummary.seatsUsed} / {seatSummary.seatLimit}
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          disabled={seatSummary.seatsUsed >= seatSummary.seatLimit}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition ${
            seatSummary.seatsUsed >= seatSummary.seatLimit
              ? "bg-gray-400 text-gray-100 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          <FiPlus /> Invite User
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}
      {notice && <p className="text-green-600 mb-4">{notice}</p>}

      <div className="bg-white dark:bg-[#0d1a2e] p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Members & Invite Status
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" className="px-6 py-3">Type</th>
                <th scope="col" className="px-6 py-3">Name</th>
                <th scope="col" className="px-6 py-3">Email</th>
                <th scope="col" className="px-6 py-3">Status</th>
                <th scope="col" className="px-6 py-3">Invited At</th>
                <th scope="col" className="px-6 py-3">Expires At</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 && visibleInvites.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-4">
                    No users or invites found.
                  </td>
                </tr>
              ) : (
                <>
                  {users.map((user) => (
                    <tr
                      key={`user-${user._id}`}
                      className="bg-white dark:bg-[#0d1a2e] border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <td className="px-6 py-4">Member</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.status === "active"
                              ? "bg-green-200 text-green-800"
                              : "bg-red-200 text-red-800"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4 flex justify-end gap-4">
                        <button
                          onClick={() => handleOpenEditModal(user)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Edit"
                        >
                          <FiEdit size={18} />
                        </button>
                        <button
                          onClick={() => setMemberToRemove(user)}
                          disabled={Boolean(user.isOwner)}
                          className={
                            user.isOwner
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-red-500 hover:text-red-700 cursor-pointer"
                          }
                          title="Remove Member"
                          aria-label={`Remove user ${user.name || ""}`}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {visibleInvites.map((invite) => (
                    <tr
                      key={`invite-${invite.id}`}
                      className="bg-white dark:bg-[#0d1a2e] border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <td className="px-6 py-4">Invite</td>
                      <td className="px-6 py-4">-</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {invite.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            invite.status === "accepted"
                              ? "bg-green-200 text-green-800"
                              : invite.status === "pending"
                              ? "bg-yellow-200 text-yellow-800"
                              : invite.status === "expired"
                              ? "bg-red-200 text-red-800"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {invite.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {invite.invitedAt
                          ? new Date(invite.invitedAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        {invite.expiresAt
                          ? new Date(invite.expiresAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {invite.status === "pending" ? (
                          <button
                            onClick={() => setInviteToStop(invite)}
                            className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer"
                          >
                            Stop Invite
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        title="Invite User To Enterprise"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              User Email
            </label>
            <input
              type="email"
              name="email"
              value={addFormData.email}
              onChange={handleAddChange}
              placeholder="Enter registered user email"
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleCloseAddModal}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send Invite
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title="Edit User"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={editFormData.name}
              onChange={handleEditChange}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={editFormData.email}
              onChange={handleEditChange}
              required
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              name="status"
              value={editFormData.status}
              onChange={handleEditChange}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleCloseEditModal}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(memberToRemove)}
        onClose={() => setMemberToRemove(null)}
        onConfirm={handleConfirmRemoveMember}
        title="Remove Enterprise Member"
        message={`Are you sure you want to remove "${memberToRemove?.name || memberToRemove?.email || "this user"}" from the enterprise workspace? They will lose access to team resources and revert to a standard user account.`}
        confirmText="Remove Member"
        cancelText="Cancel"
        variant="danger"
        isLoading={isRemovingMember}
        loadingText="Removing..."
      />

      {/* Stop Invite Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(inviteToStop)}
        onClose={() => setInviteToStop(null)}
        onConfirm={handleConfirmStopInvite}
        title="Revoke Invitation"
        message={`Are you sure you want to stop and revoke the invitation for "${inviteToStop?.email || "this user"}"? The invitation link will no longer be valid.`}
        confirmText="Revoke Invite"
        cancelText="Cancel"
        variant="danger"
        isLoading={isStoppingInvite}
        loadingText="Revoking..."
      />
    </div>
  );
};

export default EnterpriseAdmin;

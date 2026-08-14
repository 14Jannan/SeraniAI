import React, { useEffect, useState } from "react";
import {
  fetchSubscriptions,
  deleteSubscriptionById,
  forceActivateSubscription,
} from "../../api/subscriptionApi";
import ConfirmModal from "../../components/ConfirmModal";

/* Admin page component for managing all user subscriptions */
const AdminSubscriptions = () => {
  /* State management for subscriptions list and UI feedback */
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [subToDelete, setSubToDelete] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [subToActivate, setSubToActivate] = useState(null);

  /* Fetch all subscriptions on component mount */
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const res = await fetchSubscriptions();
        setSubscriptions(res.data);
      } catch (err) {
        setError("Failed to load subscriptions");
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptions();
  }, []);

  /* Filter subscriptions based on search query (email or payment ID) */
  const query = search.trim().toLowerCase();
  const filteredData = subscriptions.filter((sub) => {
    if (!query) return true;

    const email = sub.userId?.email?.toLowerCase() || "";
    const paymentId = String(sub.paymentId || "").toLowerCase();
    return email.includes(query) || paymentId.includes(query);
  });

  /* Execute subscription deletion after modal confirmation */
  const handleConfirmDelete = async () => {
    if (!subToDelete) return;
    const subscriptionId = subToDelete._id;

    try {
      setDeletingId(subscriptionId);
      await deleteSubscriptionById(subscriptionId);
      setSubscriptions((prev) => prev.filter((sub) => sub._id !== subscriptionId));
      setError("");
      setSubToDelete(null);
    } catch {
      setError("Failed to delete subscription");
    } finally {
      setDeletingId(null);
    }
  };

  /* Force-activate a stuck/pending subscription without PayHere verification
   * (admin override) after modal confirmation. */
  const handleConfirmActivate = async () => {
    if (!subToActivate) return;
    const subscriptionId = subToActivate._id;

    try {
      setActivatingId(subscriptionId);
      const res = await forceActivateSubscription(subscriptionId);
      const updated = res.data?.data;
      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub._id === subscriptionId
            ? { ...sub, ...updated, userId: sub.userId }
            : sub,
        ),
      );
      setError("");
      setSubToActivate(null);
    } catch {
      setError("Failed to activate subscription");
    } finally {
      setActivatingId(null);
    }
  };

  /* Show loading state while fetching data */
  if (loading) {
    return <p className="mt-10 text-center">Loading subscriptions...</p>;
  }

  /* Show error message if data fetch fails */
  if (error) {
    return <p className="mt-10 text-center text-red-500">{error}</p>;
  }

  /* Main admin subscriptions management table */
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Subscriptions</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage user subscriptions.</p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border px-4 py-2 dark:bg-gray-700 dark:text-white md:w-1/3"
        />
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow dark:bg-gray-800">
        <table className="w-full text-left">
          <thead className="border-b dark:border-gray-700">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Status</th>
              <th className="p-4">Start Date</th>
              <th className="p-4">End Date</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((sub) => (
              <tr
                key={sub._id}
                className="border-b hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              >
                <td className="p-4">{sub.userId?.email || "N/A"}</td>
                <td className="p-4">
                  {sub.plan} ({sub.billingCycle || "Monthly"})
                </td>
                <td className="p-4">
                  {sub.currency || "LKR"} {Number(sub.amount || 0).toLocaleString()}
                </td>
                <td className="p-4">
                  <span
                    className={`rounded-full px-3 py-1 text-sm ${
                      sub.status === "Active"
                        ? "bg-green-100 text-green-600"
                        : sub.status === "Expired"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-600"
                    }`}
                  >
                    {sub.status}
                  </span>
                </td>
                <td className="p-4">{new Date(sub.startDate).toLocaleDateString()}</td>
                <td className="p-4">{new Date(sub.endDate).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {sub.status !== "Active" && (
                      <button
                        onClick={() => setSubToActivate(sub)}
                        disabled={activatingId === sub._id}
                        title="Manually activate this subscription without PayHere verification"
                        className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        {activatingId === sub._id ? "Activating..." : "Force Activate"}
                      </button>
                    )}
                    <button
                      onClick={() => setSubToDelete(sub)}
                      disabled={deletingId === sub._id}
                      className="rounded bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {deletingId === sub._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-6 text-center text-gray-500">No subscriptions found.</div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(subToDelete)}
        onClose={() => setSubToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Subscription"
        message={
          subToDelete?.status === "Active"
            ? `Delete this active subscription for ${subToDelete?.userId?.email || "this user"}? If no other active subscription exists, the user will be downgraded to Free.`
            : `Are you sure you want to delete this subscription record for ${subToDelete?.userId?.email || "this user"}?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={Boolean(deletingId)}
        loadingText="Deleting..."
      />

      {/* Force Activate Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(subToActivate)}
        onClose={() => setSubToActivate(null)}
        onConfirm={handleConfirmActivate}
        title="Force Activate Subscription"
        message={`This activates the ${subToActivate?.plan || ""} plan for ${
          subToActivate?.userId?.email || "this user"
        } immediately WITHOUT verifying payment with PayHere. Only use this if you've independently confirmed the payment went through (e.g. it's visible in the PayHere dashboard). This action is logged.`}
        confirmText="Force Activate"
        cancelText="Cancel"
        variant="danger"
        isLoading={Boolean(activatingId)}
        loadingText="Activating..."
      />
    </div>
  );
};

export default AdminSubscriptions;

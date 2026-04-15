import React, { useEffect, useState } from "react";
import { fetchSubscriptions } from "../../api/subscriptionApi";

const AdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const query = search.trim().toLowerCase();
  const filteredData = subscriptions.filter((sub) => {
    if (!query) return true;

    const email = sub.userId?.email?.toLowerCase() || "";
    const paymentId = String(sub.paymentId || "").toLowerCase();
    return email.includes(query) || paymentId.includes(query);
  });

  if (loading) {
    return <p className="mt-10 text-center">Loading subscriptions...</p>;
  }

  if (error) {
    return <p className="mt-10 text-center text-red-500">{error}</p>;
  }

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
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="p-6 text-center text-gray-500">No subscriptions found.</div>
        )}
      </div>
    </div>
  );
};

export default AdminSubscriptions;

import React from "react";
import { Link } from "react-router-dom";

function getCurrentRole() {
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.role || "user";
  } catch (error) {
    return "user";
  }
}

const PlanFeatureGate = ({
  children,
  featureName = "This feature",
  description = "Upgrade to Premium to unlock this feature.",
}) => {
  const role = getCurrentRole();
  const isFreeUser = role === "user";

  if (!isFreeUser) {
    return children;
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-700/50 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {featureName} Is Premium Only
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {description}
      </p>
      <div className="mt-5">
        <Link
          to="/subscription"
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Upgrade To Premium
        </Link>
      </div>
    </div>
  );
};

export default PlanFeatureGate;
import React from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../utils/authStorage";

/* Helper function to retrieve the user's role from localStorage */
function getCurrentRole() {
  return getStoredUser()?.role || "user";
}

/* Component that gates premium features behind a subscription requirement */
const PlanFeatureGate = ({
  children,
  featureName = "This feature",
  description = "Upgrade to Premium to unlock this feature.",
}) => {
  /* Retrieve current user role and determine if user is on free plan */
  const role = getCurrentRole();
  const isFreeUser = role === "user";

  /* If user is not a free user, render the feature directly */
  if (!isFreeUser) {
    return children;
  }

  /* Display premium-only message and upgrade prompt for free users */
  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-700/50 dark:bg-slate-900">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        {featureName} Is Premium Only
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {description}
      </p>
      {/* Button to navigate to subscription page */}
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
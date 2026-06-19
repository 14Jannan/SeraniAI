import React from "react";
import PremiumPlanJournal from "./PremiumPlanJournal";
import FreePlanJournal from "./FreePlanJournal";

function getCurrentRole() {
  // Resolve the persisted user role, defaulting to the free-plan role on parse errors.
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.role || "user";
  } catch (error) {
    return "user";
  }
}

const Journal = () => {
  const role = getCurrentRole();
  // Users with role "user" are routed to the free-plan journal experience.
  const isFreeUser = role === "user";

  if (isFreeUser) {
    return <FreePlanJournal />;
  }

  return <PremiumPlanJournal />;
};

export default Journal;
import React from "react";
import PremiumPlanJournal from "./PremiumPlanJournal";
import FreePlanJournal from "./FreePlanJournal";

function getCurrentRole() {
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
  const isFreeUser = role === "user";

  if (isFreeUser) {
    return <FreePlanJournal />;
  }

  return <PremiumPlanJournal />;
};

export default Journal;
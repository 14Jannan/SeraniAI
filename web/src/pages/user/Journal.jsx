import React from "react";
import PremiumPlanJournal from "./PremiumPlanJournal";
import FreePlanJournal from "./FreePlanJournal";
import { getStoredUser } from "../../utils/authStorage";

function getCurrentRole() {
  try {
    const parsed = getStoredUser();
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
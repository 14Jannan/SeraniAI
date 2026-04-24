import React from "react";
import Journal from "../pages/user/Journal";
import FreePlanJournal from "../pages/user/FreePlanJournal";

function getCurrentRole() {
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.role || "user";
  } catch (error) {
    return "user";
  }
}

const JournalRouteGuard = () => {
  const role = getCurrentRole();
  const isFreeUser = role === "user";

  if (isFreeUser) {
    return <FreePlanJournal />;
  }

  return <Journal />;
};

export default JournalRouteGuard;
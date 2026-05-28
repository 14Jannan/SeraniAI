import React from "react";
import Journal from "../pages/user/Journal";
import FreePlanJournal from "../pages/user/FreePlanJournal";
import { getStoredUser } from "../utils/authStorage";

function getCurrentRole() {
  return getStoredUser()?.role || "user";
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
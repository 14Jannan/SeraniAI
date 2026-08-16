// Roles with an active paid plan (Pro or enterprise). Free-tier accounts
// have role "user" or no role at all.
export const PAID_ROLES = ["(Pro)PlanUser", "enterpriseUser", "enterpriseAdmin"];

export const isPaidRole = (role) => PAID_ROLES.includes(String(role || ""));

// Kept for existing callers; journal access uses the same paid-role list.
export const PAID_JOURNAL_ROLES = PAID_ROLES;
export const isPaidJournalRole = isPaidRole;
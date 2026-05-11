export const PAID_JOURNAL_ROLES = [
  "(Pro)PlanUser",
  "enterpriseUser",
  "enterpriseAdmin",
];

export const isPaidJournalRole = (role) =>
  PAID_JOURNAL_ROLES.includes(String(role || ""));
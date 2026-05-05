const { z } = require("zod");

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters");

const roleSchema = z.enum([
  "user",
  "admin",
  "enterpriseUser",
  "enterpriseAdmin",
  "(Pro)PlanUser",
  "enterprise",
]);

const createAdminUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().trim().min(6, "Password must be at least 6 characters"),
  role: roleSchema,
});

const updateAdminUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: z.string().trim().min(6, "Password must be at least 6 characters").optional(),
  role: roleSchema.optional(),
});

module.exports = {
  createAdminUserSchema,
  updateAdminUserSchema,
};
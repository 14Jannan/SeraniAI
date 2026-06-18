const { z } = require("zod");

const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

const passwordSchema = z
  .string()
  .trim()
  .min(6, "Password must be atleast 6 characters long");

const otpSchema = z.string().trim().length(6, "OTP must be 6 digits");

const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be atleast 2 characters long")
  .max(50, "Name must be at most 50 characters long");

const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: passwordSchema,
  role: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().trim().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
  newPassword: passwordSchema,
});

const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

const resendVerificationOtpSchema = z.object({
  email: emailSchema,
});

const onboardingSchema = z.object({
  profession: z.string().trim().min(1, "Profession is required"),
  interests: z.array(z.string()).min(1, "Select at least one interest"),
  goals: z.string().trim().min(1, "Goals are required"),
  expectations: z.string().trim().min(1, "Expectations are required"),
  communicationStyle: z.string().trim().default("Supportive"),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationOtpSchema,
  onboardingSchema,
};

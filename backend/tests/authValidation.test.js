import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationOtpSchema,
  onboardingSchema,
} from "../validations/authValidation.js";

describe("authValidation schemas", () => {
  describe("registerSchema", () => {
    const validPayload = {
      name: "Alice",
      email: "alice@test.com",
      password: "password1",
      confirmPassword: "password1",
    };

    it("accepts a valid registration payload", () => {
      const result = registerSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("trims and lowercases-safe the email but keeps casing (only trims)", () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        email: "  Alice@Test.com  ",
      });
      expect(result.success).toBe(true);
      expect(result.data.email).toBe("Alice@Test.com");
    });

    it("rejects an invalid email format", () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a password shorter than 6 characters", () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        password: "abc",
        confirmPassword: "abc",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a name shorter than 2 characters", () => {
      const result = registerSchema.safeParse({ ...validPayload, name: "A" });
      expect(result.success).toBe(false);
    });

    it("rejects a name longer than 50 characters", () => {
      const result = registerSchema.safeParse({
        ...validPayload,
        name: "A".repeat(51),
      });
      expect(result.success).toBe(false);
    });

    it("allows role to be omitted", () => {
      const { role, ...payloadWithoutRole } = { ...validPayload, role: "user" };
      const result = registerSchema.safeParse(payloadWithoutRole);
      expect(result.success).toBe(true);
    });

    it("does NOT enforce that password equals confirmPassword at the schema level", () => {
      // NOTE: this is intentional - password/confirmPassword matching is
      // enforced in the controller (registerUser), not in the zod schema.
      // This test documents that behavior so the validation layer isn't
      // mistaken for the source of truth on password matching.
      const result = registerSchema.safeParse({
        ...validPayload,
        password: "password1",
        confirmPassword: "different1",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("loginSchema", () => {
    it("accepts a valid login payload without rememberMe", () => {
      const result = loginSchema.safeParse({
        email: "bob@test.com",
        password: "anything",
      });
      expect(result.success).toBe(true);
      expect(result.data.rememberMe).toBe(false);
    });

    it("accepts rememberMe: true", () => {
      const result = loginSchema.safeParse({
        email: "bob@test.com",
        password: "anything",
        rememberMe: true,
      });
      expect(result.success).toBe(true);
      expect(result.data.rememberMe).toBe(true);
    });

    it("rejects an empty password", () => {
      const result = loginSchema.safeParse({
        email: "bob@test.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects a missing email", () => {
      const result = loginSchema.safeParse({ password: "anything" });
      expect(result.success).toBe(false);
    });

    it("rejects a non-boolean rememberMe", () => {
      const result = loginSchema.safeParse({
        email: "bob@test.com",
        password: "anything",
        rememberMe: "true",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("accepts a valid email", () => {
      expect(
        forgotPasswordSchema.safeParse({ email: "a@test.com" }).success,
      ).toBe(true);
    });

    it("rejects an invalid email", () => {
      expect(
        forgotPasswordSchema.safeParse({ email: "nope" }).success,
      ).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    const valid = {
      email: "a@test.com",
      otp: "123456",
      newPassword: "newpass1",
    };

    it("accepts a valid payload", () => {
      expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects an OTP that is not exactly 6 characters", () => {
      expect(
        resetPasswordSchema.safeParse({ ...valid, otp: "12345" }).success,
      ).toBe(false);
      expect(
        resetPasswordSchema.safeParse({ ...valid, otp: "1234567" }).success,
      ).toBe(false);
    });

    it("rejects a newPassword shorter than 6 characters", () => {
      expect(
        resetPasswordSchema.safeParse({ ...valid, newPassword: "abc" })
          .success,
      ).toBe(false);
    });
  });

  describe("verifyEmailSchema", () => {
    it("accepts a valid email + 6-digit otp", () => {
      const result = verifyEmailSchema.safeParse({
        email: "a@test.com",
        otp: "654321",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-6-digit otp", () => {
      const result = verifyEmailSchema.safeParse({
        email: "a@test.com",
        otp: "42",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("resendVerificationOtpSchema", () => {
    it("accepts a valid email", () => {
      expect(
        resendVerificationOtpSchema.safeParse({ email: "a@test.com" })
          .success,
      ).toBe(true);
    });

    it("rejects a missing email", () => {
      expect(resendVerificationOtpSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("onboardingSchema", () => {
    const valid = {
      profession: "Engineer",
      interests: ["reading"],
      goals: "Grow",
      expectations: "Support",
    };

    it("accepts a valid payload and defaults communicationStyle", () => {
      const result = onboardingSchema.safeParse(valid);
      expect(result.success).toBe(true);
      expect(result.data.communicationStyle).toBe("Supportive");
    });

    it("rejects an empty interests array", () => {
      const result = onboardingSchema.safeParse({ ...valid, interests: [] });
      expect(result.success).toBe(false);
    });

    it("rejects a missing profession", () => {
      const { profession, ...rest } = valid;
      const result = onboardingSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });
});

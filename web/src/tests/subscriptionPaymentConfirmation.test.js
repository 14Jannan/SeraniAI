import { describe, expect, it, vi, beforeEach } from "vitest";

const notifyInfoMock = vi.fn();
const notifyPaymentSuccessMock = vi.fn();

vi.mock("../utils/notifications", () => ({
  default: {
    info: notifyInfoMock,
    paymentSuccess: notifyPaymentSuccessMock,
    // Other methods referenced at module scope in Subscription.jsx but not
    // exercised by these tests.
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    paymentCancelled: vi.fn(),
    subscriptionCancelled: vi.fn(),
    enterpriseAccessCancelled: vi.fn(),
    upgradeBlocked: vi.fn(),
    dismissAll: vi.fn(),
  },
}));

const { notifyPaymentConfirmationResult } = await import(
  "../pages/user/Subscription"
);

describe("notifyPaymentConfirmationResult (PayHere payment-confirmation UX)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SECURITY: shows a 'confirming' toast (not success) while the notify webhook hasn't landed yet", () => {
    notifyPaymentConfirmationResult({ pending: true, subscription: { status: "Pending" } });

    expect(notifyInfoMock).toHaveBeenCalledWith(
      "Confirming Your Payment",
      expect.stringContaining("being confirmed"),
      expect.objectContaining({ id: "payment-pending" }),
    );
    expect(notifyPaymentSuccessMock).not.toHaveBeenCalled();
  });

  it("shows the success toast once the backend confirms the subscription is active", () => {
    notifyPaymentConfirmationResult({
      user: { plan: "Personal" },
      subscription: { status: "Active" },
    });

    expect(notifyPaymentSuccessMock).toHaveBeenCalledWith({ planName: "Personal" });
    expect(notifyInfoMock).not.toHaveBeenCalled();
  });

  it("defaults the plan name to 'Pro' when the response doesn't include one", () => {
    notifyPaymentConfirmationResult({ user: {} });

    expect(notifyPaymentSuccessMock).toHaveBeenCalledWith({ planName: "Pro" });
  });

  it("treats a null/undefined response as success (matches the pre-fix response shape)", () => {
    notifyPaymentConfirmationResult(null);

    expect(notifyPaymentSuccessMock).toHaveBeenCalledWith({ planName: "Pro" });
    expect(notifyInfoMock).not.toHaveBeenCalled();
  });
});

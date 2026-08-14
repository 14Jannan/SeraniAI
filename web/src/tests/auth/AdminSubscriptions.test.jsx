import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminSubscriptions from "../../pages/admin/AdminSubscriptions";
import {
  fetchSubscriptions,
  deleteSubscriptionById,
  forceActivateSubscription,
} from "../../api/subscriptionApi";

vi.mock("../../api/subscriptionApi", () => ({
  fetchSubscriptions: vi.fn(),
  deleteSubscriptionById: vi.fn(),
  forceActivateSubscription: vi.fn(),
}));

const pendingSub = {
  _id: "sub-pending",
  userId: { email: "itjogeesan@gmail.com" },
  plan: "Personal",
  billingCycle: "Monthly",
  amount: 4000,
  currency: "LKR",
  status: "Pending",
  startDate: "2026-08-14",
  endDate: "2026-09-14",
};

const activeSub = {
  _id: "sub-active",
  userId: { email: "someoneelse@gmail.com" },
  plan: "Business",
  billingCycle: "Monthly",
  amount: 15000,
  currency: "LKR",
  status: "Active",
  startDate: "2026-08-01",
  endDate: "2026-09-01",
};

describe("AdminSubscriptions Page - Force Activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSubscriptions).mockResolvedValue({
      data: [pendingSub, activeSub],
    });
  });

  it("shows a Force Activate button for a Pending row but not for an Active row", async () => {
    render(<AdminSubscriptions />);

    await waitFor(() => {
      expect(screen.getByText("itjogeesan@gmail.com")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const pendingRow = rows.find((r) => r.textContent.includes("itjogeesan@gmail.com"));
    const activeRow = rows.find((r) => r.textContent.includes("someoneelse@gmail.com"));

    expect(
      pendingRow.querySelector("button.bg-green-600"),
    ).toBeInTheDocument();
    expect(
      activeRow.querySelector("button.bg-green-600"),
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation, warning that PayHere is bypassed, before activating", async () => {
    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    fireEvent.click(screen.getByRole("button", { name: /force activate/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/without verifying payment with PayHere/i)).toBeInTheDocument();
    expect(forceActivateSubscription).not.toHaveBeenCalled();
  });

  it("activates the subscription and updates the row to Active on confirm", async () => {
    vi.mocked(forceActivateSubscription).mockResolvedValue({
      data: {
        message: "Subscription force-activated",
        data: { ...pendingSub, status: "Active" },
      },
    });

    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    fireEvent.click(screen.getByRole("button", { name: /force activate/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^force activate$/i }));

    await waitFor(() => {
      expect(forceActivateSubscription).toHaveBeenCalledWith("sub-pending");
    });

    // The Pending row's status badge should now read Active, and its
    // Force Activate button should disappear (no longer non-Active).
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      const row = rows.find((r) => r.textContent.includes("itjogeesan@gmail.com"));
      expect(row.textContent).toContain("Active");
      expect(row.querySelector("button.bg-green-600")).not.toBeInTheDocument();
    });
  });

  it("shows an error message if activation fails", async () => {
    vi.mocked(forceActivateSubscription).mockRejectedValue(new Error("boom"));

    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    fireEvent.click(screen.getByRole("button", { name: /force activate/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^force activate$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to activate subscription/i)).toBeInTheDocument();
    });
  });

  it("deleting a subscription still works (unaffected by the new action)", async () => {
    vi.mocked(deleteSubscriptionById).mockResolvedValue({});

    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    const rows = screen.getAllByRole("row");
    const pendingRow = rows.find((r) => r.textContent.includes("itjogeesan@gmail.com"));
    fireEvent.click(pendingRow.querySelector("button.bg-red-600"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteSubscriptionById).toHaveBeenCalledWith("sub-pending");
    });
  });
});

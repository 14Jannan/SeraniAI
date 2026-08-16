import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import AdminSubscriptions from "../../pages/admin/AdminSubscriptions";
import { fetchSubscriptions, deleteSubscriptionById } from "../../api/subscriptionApi";

vi.mock("../../api/subscriptionApi", () => ({
  fetchSubscriptions: vi.fn(),
  deleteSubscriptionById: vi.fn(),
}));

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

const cancelledSub = {
  _id: "sub-cancelled",
  userId: { email: "itjogeesan@gmail.com" },
  plan: "Personal",
  billingCycle: "Monthly",
  amount: 4000,
  currency: "LKR",
  status: "Cancelled",
  startDate: "2026-07-01",
  endDate: "2026-08-01",
};

describe("AdminSubscriptions Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSubscriptions).mockResolvedValue({
      data: [activeSub, cancelledSub],
    });
  });

  it("renders the subscriptions returned by the API and never shows a Force Activate action", async () => {
    render(<AdminSubscriptions />);

    await waitFor(() => {
      expect(screen.getByText("someoneelse@gmail.com")).toBeInTheDocument();
    });

    expect(screen.getByText("itjogeesan@gmail.com")).toBeInTheDocument();
    // getAllSubscriptions never returns "Pending" rows, and the Force
    // Activate feature (which only ever acted on Pending rows) is gone.
    expect(
      screen.queryByRole("button", { name: /force activate/i }),
    ).not.toBeInTheDocument();
  });

  it("gives a non-Active status (e.g. Cancelled) its own neutral badge, not the old Pending yellow", async () => {
    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    const badge = screen.getByText("Cancelled");
    expect(badge).toHaveClass("bg-gray-100", "text-gray-600");
    expect(badge).not.toHaveClass("bg-yellow-100");
  });

  it("deletes a subscription after confirmation", async () => {
    vi.mocked(deleteSubscriptionById).mockResolvedValue({});

    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    const rows = screen.getAllByRole("row");
    const cancelledRow = rows.find((r) => r.textContent.includes("itjogeesan@gmail.com"));
    fireEvent.click(cancelledRow.querySelector("button.bg-red-600"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(deleteSubscriptionById).toHaveBeenCalledWith("sub-cancelled");
    });
  });

  it("shows an error message if delete fails", async () => {
    vi.mocked(deleteSubscriptionById).mockRejectedValue(new Error("boom"));

    render(<AdminSubscriptions />);
    await waitFor(() => screen.getByText("itjogeesan@gmail.com"));

    const rows = screen.getAllByRole("row");
    const cancelledRow = rows.find((r) => r.textContent.includes("itjogeesan@gmail.com"));
    fireEvent.click(cancelledRow.querySelector("button.bg-red-600"));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete subscription/i)).toBeInTheDocument();
    });
  });
});

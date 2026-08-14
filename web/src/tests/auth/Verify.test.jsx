import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Verify from "../../pages/Verify";

vi.mock("../../api/authApi", () => ({
  verifyOtp: vi.fn(),
  resendOtp: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ token: "valid-token-123" })],
    useParams: () => ({ token: "valid-token-123" }),
  };
});

const renderVerify = (email = "user@test.com") =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/verify",
          state: { email },
        },
      ]}
    >
      <Verify />
    </MemoryRouter>,
  );

const getOtpInput = () => document.querySelector('input[type="text"]');

describe("Verify (Email/OTP) Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the verify page", () => {
    renderVerify();

    expect(
      screen.getByRole("heading", { name: /verify email/i }),
    ).toBeInTheDocument();
    expect(getOtpInput()).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify account/i }),
    ).toBeInTheDocument();
  });

  it("allows typing the OTP", () => {
    renderVerify();

    fireEvent.change(getOtpInput(), {
      target: { value: "123456" },
    });

    expect(getOtpInput()).toHaveValue("123456");
  });

  it("calls verifyOtp and navigates to login on success", async () => {
    const { verifyOtp } = await import("../../api/authApi");
    vi.mocked(verifyOtp).mockResolvedValueOnce({
      token: "access-token",
      user: { id: "1", role: "user" },
    });

    renderVerify();

    fireEvent.change(getOtpInput(), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify account/i }));

    await waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        email: "user@test.com",
        otp: "123456",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });


  it("shows an error message when verification fails", async () => {
    const { verifyOtp } = await import("../../api/authApi");
    vi.mocked(verifyOtp).mockRejectedValueOnce({
      response: { data: { message: "Invalid OTP" } },
    });

    renderVerify();

    fireEvent.change(getOtpInput(), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /verify account/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid otp/i)).toBeInTheDocument();
    });
  });

  it("shows a resend button", () => {
    renderVerify();

    expect(screen.getByRole("button", { name: /resend/i })).toBeInTheDocument();
  });
});

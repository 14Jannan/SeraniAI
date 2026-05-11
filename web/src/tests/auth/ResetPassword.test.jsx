import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ResetPassword from "../../pages/ResetPassword";
import { resetPassword } from "../../api/authApi";

vi.mock("../../api/authApi", () => ({
  resetPassword: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ token: "reset-token-abc" })],
    useParams: () => ({ token: "reset-token-abc" }),
  };
});

const renderResetPassword = (email = "user@test.com") =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/reset-password",
          state: { email },
        },
      ]}
    >
      <ResetPassword />
    </MemoryRouter>,
  );

const getOtpInput = () => document.querySelector('input[type="text"]');
const getPasswordInput = () => document.querySelector('input[type="password"]');

describe("ResetPassword Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the reset password form", () => {
    renderResetPassword();

    expect(
      screen.getByRole("heading", { name: /set new password/i }),
    ).toBeInTheDocument();
    expect(getOtpInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i }),
    ).toBeInTheDocument();
  });

  it("allows typing the otp and new password", () => {
    renderResetPassword();

    fireEvent.change(getOtpInput(), {
      target: { value: "123456" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "NewPass123!" },
    });

    expect(getOtpInput()).toHaveValue("123456");
    expect(getPasswordInput()).toHaveValue("NewPass123!");
  });

  it("calls resetPassword and navigates to login on success", async () => {
    vi.mocked(resetPassword).mockResolvedValueOnce({});

    renderResetPassword();

    fireEvent.change(getOtpInput(), {
      target: { value: "123456" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "NewStrongPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        email: "user@test.com",
        otp: "123456",
        newPassword: "NewStrongPass1!",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("shows an alert when the reset request fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(resetPassword).mockRejectedValueOnce({
      response: { data: { message: "Token expired" } },
    });

    renderResetPassword();

    fireEvent.change(getOtpInput(), {
      target: { value: "123456" },
    });
    fireEvent.change(getPasswordInput(), {
      target: { value: "NewStrongPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Token expired");
    });

    alertSpy.mockRestore();
  });
});

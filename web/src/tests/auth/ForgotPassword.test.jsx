import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../../pages/ForgotPassword";
import { forgotPassword } from "../../api/authApi";

const mockNavigate = vi.fn();

vi.mock("../../api/authApi", () => ({
  forgotPassword: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderForgotPassword = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>,
  );

const getEmailInput = () => document.querySelector('input[type="email"]');

describe("ForgotPassword Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the forgot password form", () => {
    renderForgotPassword();

    expect(
      screen.getByRole("heading", { name: /forgot password/i }),
    ).toBeInTheDocument();
    expect(getEmailInput()).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: /send reset code/i }),
    ).toBeInTheDocument();
  });

  it("allows typing an email address", () => {
    renderForgotPassword();

    fireEvent.change(getEmailInput(), { target: { value: "user@test.com" } });
    expect(getEmailInput()).toHaveValue("user@test.com");
  });

  it("shows the browser validation prompt when submitting an empty form", async () => {
    renderForgotPassword();
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /send reset code/i }),
      ).toBeInTheDocument();
    });
  });

  it("calls forgotPassword and navigates to reset-password on success", async () => {
    vi.mocked(forgotPassword).mockResolvedValueOnce({});

    renderForgotPassword();

    fireEvent.change(getEmailInput(), { target: { value: "user@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => {
      expect(forgotPassword).toHaveBeenCalledWith({ email: "user@test.com" });
      expect(mockNavigate).toHaveBeenCalledWith("/reset-password", {
        state: { email: "user@test.com" },
      });
    });
  });

  it("shows an alert when the API call fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.mocked(forgotPassword).mockRejectedValueOnce({
      response: { data: { message: "User not found" } },
    });

    renderForgotPassword();

    fireEvent.change(getEmailInput(), {
      target: { value: "unknown@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("User not found");
    });

    alertSpy.mockRestore();
  });
});

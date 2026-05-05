import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../../pages/Login";

const mockNavigate = vi.fn();

vi.mock("../../api/authApi", () => ({
  login: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

const getEmailInput = () => document.querySelector('input[type="email"]');
const getPasswordInput = () => document.querySelector('input[type="password"]');

describe("Login Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders email and password fields", () => {
    renderLogin();

    expect(getEmailInput()).toHaveAttribute("type", "email");
    expect(getPasswordInput()).toHaveAttribute("type", "password");
  });

  it("renders a sign in button", () => {
    renderLogin();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("allows typing into the form fields", () => {
    renderLogin();

    fireEvent.change(getEmailInput(), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getPasswordInput(), { target: { value: "Secret123!" } });

    expect(getEmailInput()).toHaveValue("test@example.com");
    expect(getPasswordInput()).toHaveValue("Secret123!");
  });

  it("has links for password reset and registration", () => {
    renderLogin();

    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /register for free/i }),
    ).toBeInTheDocument();
  });

  it("calls login API and navigates on successful submit", async () => {
    const { login } = await import("../../api/authApi");
    login.mockResolvedValueOnce({
      token: "fake-token",
      user: { id: 1, role: "user" },
    });

    renderLogin();

    fireEvent.change(getEmailInput(), { target: { value: "user@test.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "Password1!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "Password1!",
      });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows error message on failed login", async () => {
    const { login } = await import("../../api/authApi");
    login.mockRejectedValueOnce({
      response: { data: { message: "Invalid credentials" } },
    });

    renderLogin();

    fireEvent.change(getEmailInput(), { target: { value: "wrong@test.com" } });
    fireEvent.change(getPasswordInput(), { target: { value: "WrongPass!" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});

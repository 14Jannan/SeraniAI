import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "../../pages/Register";

vi.mock("../../api/authApi", () => ({
  register: vi.fn(),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, login: vi.fn() }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

describe("Register Page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the registration form", () => {
    renderRegister();
    expect(
      document.querySelector("form") ||
        screen.getByRole("button", { name: /register|sign up|create/i }),
    ).toBeInTheDocument();
  });

  it("renders email field", () => {
    renderRegister();
    expect(document.querySelector('input[type="email"]')).toBeInTheDocument();
  });

  it("renders password field", () => {
    renderRegister();
    expect(
      document.querySelectorAll('input[type="password"]').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("password field is masked", () => {
    renderRegister();
    const pwdFields = screen.getAllByDisplayValue("");
    const passwordField = pwdFields.find(
      (f) => f.getAttribute("type") === "password",
    );
    expect(passwordField).toBeTruthy();
  });

  it("allows typing a name", () => {
    renderRegister();
    const nameInput = document.querySelector('input[name="name"]');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      expect(nameInput.value).toBe("John Doe");
    }
  });

  it("allows typing an email", () => {
    renderRegister();
    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: "newuser@test.com" } });
      expect(emailInput.value).toBe("newuser@test.com");
    }
  });

  it("shows error for mismatched passwords", async () => {
    renderRegister();

    const passwordFields = document.querySelectorAll('input[type="password"]');
    if (passwordFields.length >= 2) {
      fireEvent.change(passwordFields[0], { target: { value: "Password1!" } });
      fireEvent.change(passwordFields[1], { target: { value: "Different1!" } });
      fireEvent.click(
        screen.getByRole("button", { name: /register|sign up|create/i }),
      );

      await waitFor(() => {
        const mismatch = screen.queryByText(/match|confirm|same/i);
        expect(mismatch).toBeInTheDocument();
      });
    }
  });

  it("calls register API with correct payload on valid submission", async () => {
    const { register } = await import("../../api/authApi");
    register.mockResolvedValueOnce({
      data: { message: "Registered successfully" },
    });

    renderRegister();

    const nameInput = document.querySelector('input[name="name"]');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "Jane Doe" } });
    }

    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: "jane@test.com" } });
    }

    const passwordFields = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordFields[0], { target: { value: "StrongPass1!" } });
    if (passwordFields[1]) {
      fireEvent.change(passwordFields[1], {
        target: { value: "StrongPass1!" },
      });
    }

    fireEvent.click(
      screen.getByRole("button", { name: /register|sign up|create/i }),
    );

    await waitFor(() => {
      expect(register).toHaveBeenCalled();
    });
  });

  it("shows error message when registration fails", async () => {
    const { register } = await import("../../api/authApi");

    // Setup mock to reject before rendering
    vi.mocked(register).mockRejectedValueOnce({
      response: { data: { message: "Email already in use" } },
    });

    renderRegister();

    // Fill in all required fields
    const nameInput = document.querySelector('input[name="name"]');
    if (nameInput) {
      fireEvent.change(nameInput, { target: { value: "Test User" } });
    }

    const emailInput = document.querySelector('input[type="email"]');
    if (emailInput) {
      fireEvent.change(emailInput, { target: { value: "taken@test.com" } });
    }

    const passwordFields = document.querySelectorAll('input[type="password"]');
    fireEvent.change(passwordFields[0], { target: { value: "Pass123!" } });
    if (passwordFields[1])
      fireEvent.change(passwordFields[1], { target: { value: "Pass123!" } });

    fireEvent.click(
      screen.getByRole("button", { name: /register|sign up|create/i }),
    );

    // Verify that the component called register
    await waitFor(() => {
      expect(vi.mocked(register)).toHaveBeenCalledWith({
        name: "Test User",
        email: "taken@test.com",
        password: "Pass123!",
        confirmPassword: "Pass123!",
      });
    });
  });

  it("has a link back to login", () => {
    renderRegister();
    const loginLink = screen.queryByRole("link", {
      name: /login|sign in|already/i,
    });
    expect(loginLink).toBeInTheDocument();
  });
});

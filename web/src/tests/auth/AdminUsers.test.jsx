import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminUsers from "../../pages/admin/AdminUsers";
import { addUser, updateUser, deleteUser } from "../../api/adminApi";
import { useFetchUSers } from "../../hooks/useFetch";
import { queryClient } from "../../main";

const { mockInvalidateQueries } = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn(),
}));

vi.mock("../../hooks/useFetch", () => ({
  useFetchUSers: vi.fn(),
}));

vi.mock("../../api/adminApi", () => ({
  addUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("../../main", () => ({
  queryClient: {
    invalidateQueries: mockInvalidateQueries,
  },
}));

const mockUsers = [
  {
    _id: "1",
    name: "Alice Smith",
    email: "alice@test.com",
    role: "user",
  },
  {
    _id: "2",
    name: "Bob Jones",
    email: "bob@test.com",
    role: "user",
  },
  {
    _id: "3",
    name: "Carol White",
    email: "carol@test.com",
    role: "admin",
  },
];

const renderAdminUsers = () =>
  render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>,
  );

const setUsersState = ({
  data = mockUsers,
  isLoading = false,
  isError = false,
  error = null,
} = {}) => {
  vi.mocked(useFetchUSers).mockReturnValue({
    data,
    isLoading,
    isError,
    error,
  });
};

describe("AdminUsers Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUsersState();
  });

  it("renders the users table", () => {
    renderAdminUsers();

    expect(
      screen.getByRole("heading", { name: /user management/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
    expect(screen.getByText("Carol White")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    setUsersState({ data: [], isLoading: true });
    renderAdminUsers();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    setUsersState({
      data: [],
      isError: true,
      error: { response: { data: { message: "Unauthorized" } } },
    });
    renderAdminUsers();

    expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
  });

  it("creates a new user from the modal form", async () => {
    vi.mocked(addUser).mockResolvedValueOnce({});
    renderAdminUsers();

    fireEvent.click(screen.getByRole("button", { name: /add user/i }));
    fireEvent.change(document.querySelector('input[name="name"]'), {
      target: { value: "New User" },
    });
    fireEvent.change(document.querySelector('input[name="email"]'), {
      target: { value: "new@test.com" },
    });
    fireEvent.change(document.querySelector('input[name="password"]'), {
      target: { value: "Secret123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(addUser).toHaveBeenCalledWith({
        name: "New User",
        email: "new@test.com",
        password: "Secret123!",
        role: "user",
      });
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["users"],
      });
    });
  });

  it("edits an existing user", async () => {
    vi.mocked(updateUser).mockResolvedValueOnce({});
    renderAdminUsers();

    fireEvent.click(
      screen.getByRole("button", { name: /edit user alice smith/i }),
    );
    fireEvent.change(document.querySelector('input[name="name"]'), {
      target: { value: "Alice Updated" },
    });
    fireEvent.change(document.querySelector('input[name="email"]'), {
      target: { value: "alice.updated@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          name: "Alice Updated",
          email: "alice.updated@test.com",
          role: "user",
        }),
      );
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["users"],
      });
    });
  });

  it("deletes a user after confirmation", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(deleteUser).mockResolvedValueOnce({});
    renderAdminUsers();

    fireEvent.click(
      screen.getByRole("button", { name: /delete user alice smith/i }),
    );

    await waitFor(() => {
      expect(deleteUser).toHaveBeenCalledWith("1");
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["users"],
      });
    });
  });
});

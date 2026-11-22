import { describe, expect, it, vi } from "vitest";
import usersReducer, {
  deleteUser,
  getUsers,
  upgradeUser,
} from "./usersSlice";

vi.mock("./usersService", () => ({
  default: {
    getUsers: vi.fn(),
    deleteUser: vi.fn(),
    upgradeUser: vi.fn(),
  },
}));

describe("users feature state", () => {
  it("stores the fetched user list", () => {
    const users = [
      { _id: "user-1", name: "Ada", role: "subscriber" },
      { _id: "user-2", name: "Grace", role: "author" },
    ];

    const state = usersReducer(
      undefined,
      getUsers.fulfilled(users, "request-1")
    );

    expect(state.users).toEqual(users);
    expect(state.isLoading).toBe(false);
  });

  it("removes a deleted user from the local list", () => {
    const initial = {
      users: [
        { _id: "user-1", name: "Ada" },
        { _id: "user-2", name: "Grace" },
      ],
      isLoading: true,
      isError: false,
      isSuccess: false,
      message: "",
    };

    const state = usersReducer(
      initial,
      deleteUser.fulfilled("User deleted", "request-2", "user-1")
    );

    expect(state.users.map((user) => user._id)).toEqual(["user-2"]);
    expect(state.isLoading).toBe(false);
  });

  it("updates a user's role without refetching the full list", () => {
    const initial = {
      users: [{ _id: "user-1", name: "Ada", role: "subscriber" }],
      isLoading: true,
      isError: false,
      isSuccess: false,
      message: "",
    };

    const state = usersReducer(
      initial,
      upgradeUser.fulfilled(
        "User role updated",
        "request-3",
        { id: "user-1", role: "admin" }
      )
    );

    expect(state.users[0].role).toBe("admin");
    expect(state.isLoading).toBe(false);
  });
});

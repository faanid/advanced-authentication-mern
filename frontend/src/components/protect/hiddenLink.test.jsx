import React from "react";
import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderToString } from "react-dom/server";
import authReducer from "../../redux/features/auth/authSlice";
import {
  AdminOnlyLink,
  ShowOnLogin,
  ShowOnLogout,
} from "./hiddenLink";

const createStore = (isLoggedIn, role) => {
  const initialState = authReducer(undefined, { type: "test/init" });

  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        ...initialState,
        isLoggedIn,
        user: role ? { role } : null,
      },
    },
  });
};

const renderLinks = (isLoggedIn, role) => {
  const store = createStore(isLoggedIn, role);

  return renderToString(
    <Provider store={store}>
      <ShowOnLogin>
        <span>signed-in</span>
      </ShowOnLogin>
      <ShowOnLogout>
        <span>signed-out</span>
      </ShowOnLogout>
      <AdminOnlyLink>
        <span>admin-only</span>
      </AdminOnlyLink>
    </Provider>
  );
};

describe("authentication visibility links", () => {
  it("shows authenticated links and admin links for administrators", () => {
    const markup = renderLinks(true, "admin");

    expect(markup).toContain("signed-in");
    expect(markup).not.toContain("signed-out");
    expect(markup).toContain("admin-only");
  });

  it("shows authenticated links but hides admin links for subscribers", () => {
    const markup = renderLinks(true, "subscriber");

    expect(markup).toContain("signed-in");
    expect(markup).not.toContain("signed-out");
    expect(markup).not.toContain("admin-only");
  });

  it("shows only signed-out links when no session exists", () => {
    const markup = renderLinks(false, null);

    expect(markup).not.toContain("signed-in");
    expect(markup).toContain("signed-out");
    expect(markup).not.toContain("admin-only");
  });
});

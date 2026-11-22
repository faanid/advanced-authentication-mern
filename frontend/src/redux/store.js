import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import emailReducer from "./features/email/emailSlice";
import usersReducer from "./features/users/usersSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    email: emailReducer,
    users: usersReducer,
  },
});

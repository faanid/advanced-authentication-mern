import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/features/auth/authSlice";
import emailReducer from "../redux/features/email/emailSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    email: emailReducer,
  },
});

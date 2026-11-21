import axios from "axios";
import { validateEmail } from "../../../utils/authValidation";

export { validateEmail };

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, "");

if (!BACKEND_URL) {
  throw new Error("VITE_BACKEND_URL must be configured");
}

export const API_URL = `${BACKEND_URL}/api/users/`;

const register = async (userData) => {
  const response = await axios.post(API_URL + "register", userData);
  return response.data;
};

const login = async (userData) => {
  const response = await axios.post(API_URL + "login", userData);
  return response.data;
};

const logout = async () => {
  const response = await axios.post(API_URL + "logout");
  return response.data.message;
};
const getLoginStatus = async () => {
  const response = await axios.get(API_URL + "loginStatus");
  return response.data;
};

const getUser = async () => {
  const response = await axios.get(API_URL + "getUser");
  return response.data;
};

const updateUser = async (userData) => {
  const response = await axios.patch(API_URL + "updateUser", userData);
  return response.data;
};

const sendVerificationEmail = async () => {
  const response = await axios.post(API_URL + "sendVerificationEmail");
  return response.data.message;
};

const verifyUser = async (verificationToken) => {
  const response = await axios.patch(
    `${API_URL}verifyToken/${encodeURIComponent(verificationToken)}`
  );
  return response.data.message;
};

const changePassword = async (userData) => {
  const response = await axios.patch(API_URL + "changePassword", userData);
  return response.data.message;
};
const forgotPassword = async (userData) => {
  const response = await axios.post(API_URL + "forgotPassword", userData);
  return response.data.message;
};
const getUsers = async () => {
  const response = await axios.get(API_URL + "getUsers");
  return response.data;
};
const deleteUsers = async (id) => {
  const response = await axios.delete(API_URL + id);
  return response.data.message;
};
const resetPassword = async (userData, resetToken) => {
  const response = await axios.patch(
    `${API_URL}resetPassword/${encodeURIComponent(resetToken)}`,
    userData
  );
  return response.data.message;
};

const upgradeUser = async (userData) => {
  const response = await axios.post(API_URL + "upgradeUser", userData);
  return response.data.message;
};

const sendLoginCode = async (email) => {
  const response = await axios.post(API_URL + "sendLoginCode", { email });
  return response.data.message;
};
const loginWithCode = async ({ loginCode, email }) => {
  const response = await axios.post(API_URL + "loginWithCode", {
    loginCode,
    email,
  });

  return response.data;
};

const loginWithGoogle = async (userToken) => {
  const response = await axios.post(API_URL + "google/callback", userToken);

  return response.data;
};
const authService = {
  register,
  login,
  logout,
  getLoginStatus,
  getUser,
  updateUser,
  sendVerificationEmail,
  verifyUser,
  changePassword,
  forgotPassword,
  resetPassword,
  getUsers,
  deleteUsers,
  upgradeUser,
  sendLoginCode,
  loginWithCode,
  loginWithGoogle,
};

export default authService;

import axios from "axios";
import { API_URL } from "../../api/apiConfig";

const getUsers = async () => {
  const response = await axios.get(API_URL + "getUsers");
  return response.data;
};

const deleteUser = async (id) => {
  const response = await axios.delete(API_URL + id);
  return response.data.message;
};

const upgradeUser = async (userData) => {
  const response = await axios.post(API_URL + "upgradeUser", userData);
  return response.data.message;
};

const usersService = {
  getUsers,
  deleteUser,
  upgradeUser,
};

export default usersService;

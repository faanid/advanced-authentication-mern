import React, { useState } from "react";
import Card from "../../components/card/Card";
import profileImg from "../../assets/avatarr.png";
import "./ChangePassword.scss";
import PageMenu from "../../components/pageMenu/PageMenu";
import PasswordInput from "../../components/passwordInput/PasswordInput";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useRedirectLoggedOutUser from "../../hooks/useRedirectLoggedOutUser";
import {
  changePassword,
  logout,
  RESET,
} from "../../redux/features/auth/authSlice";
import { Spinner } from "../../components/loader/Loader";
import { validatePassword } from "../../utils/authValidation";

const initialState = {
  oldPassword: "",
  password: "",
  password2: "",
};

const ChangePassword = () => {
  useRedirectLoggedOutUser("/login");
  const [formData, setFormData] = useState(initialState);
  const { oldPassword, password2, password } = formData;

  const { isLoading, user } = useSelector((state) => state.auth);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const updatePassword = async (e) => {
    e.preventDefault();

    if (!oldPassword || !password || !password2) {
      return toast.error("All fields are required");
    }

    if (!validatePassword(password)) {
      return toast.error("Use at least 8 characters and stay within the 72-byte password limit");
    }

    if (password !== password2) {
      return toast.error("Passwords do not match");
    }

    if (oldPassword === password) {
      return toast.error("New password must be different from the current password");
    }

    const result = await dispatch(changePassword({ oldPassword, password }));

    if (changePassword.fulfilled.match(result)) {
      await dispatch(logout());
      dispatch(RESET());
      navigate("/login");
    }
  };

  return (
    <section>
      <div className="container">
        <PageMenu />
        <h2>Change Password</h2>
        <div className="--flex-start change-password">
          <Card cardClass="card">
            <div className="profile-photo">
              <div>
                <img src={user?.photo || profileImg} alt="Profile" />
                <h3>Role: {user?.role || "subscriber"}</h3>
              </div>
            </div>
            <form onSubmit={updatePassword}>
              <p>
                <label>Current Password</label>
                <PasswordInput
                  placeholder="Current password"
                  name="oldPassword"
                  value={oldPassword}
                  onChange={handleInputChange}
                  maxLength={72}
                />
              </p>
              <p>
                <label>New Password:</label>
                <PasswordInput
                  placeholder="Password"
                  name="password"
                  value={password}
                  onChange={handleInputChange}
                  minLength={8}
                  maxLength={72}
                />
              </p>
              <p>
                <label>Confirm New Password:</label>
                <PasswordInput
                  placeholder="Confirm Password"
                  name="password2"
                  value={password2}
                  onChange={handleInputChange}
                  minLength={8}
                  maxLength={72}
                />
              </p>
              {isLoading ? (
                <Spinner />
              ) : (
                <button
                  type="submit"
                  className="--btn --btn-danger --btn-block"
                >
                  Change Password
                </button>
              )}
            </form>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ChangePassword;

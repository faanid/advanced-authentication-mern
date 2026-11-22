import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MdPassword } from "react-icons/md";
import styles from "./auth.module.scss";
import Card from "../../components/card/Card";
import PasswordInput from "../../components/passwordInput/PasswordInput";
import Loader from "../../components/loader/Loader";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RESET, resetPassword } from "../../redux/features/auth/authSlice";
import { validatePassword } from "../../utils/authValidation";

const initialState = {
  password: "",
  password2: "",
};

const Reset = () => {
  const [formData, setFormData] = useState(initialState);
  const { password, password2 } = formData;
  const { resetToken } = useParams();

  const { isLoading, isSuccess, message } = useSelector(
    (state) => state.auth
  );
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const reset = async (e) => {
    e.preventDefault();
    if (!validatePassword(password)) {
      return toast.error("Use at least 8 characters and stay within the 72-byte password limit");
    }

    if (password !== password2) {
      return toast.error("Passwords do not match");
    }
    const userData = {
      password,
    };

    await dispatch(resetPassword({ userData, resetToken }));
  };
  useEffect(() => {
    if (isSuccess && message.toLowerCase().includes("password reset successful")) {
      navigate("/login");
    }

    dispatch(RESET());
  }, [dispatch, navigate, message, isSuccess]);

  return (
    <div className={`container ${styles.auth}`}>
      {isLoading && <Loader />}
      <Card>
        <div className={styles.form}>
          <div className="--flex-center">
            <MdPassword size={35} color="#999" />
          </div>
          <h2>Reset Password</h2>

          <form onSubmit={reset}>
            <PasswordInput
              placeholder="Password"
              name="password"
              value={password}
              onChange={handleInputChange}
              minLength={8}
              maxLength={72}
            />
            <PasswordInput
              placeholder="Confirm Password"
              name="password2"
              value={password2}
              onChange={handleInputChange}
              minLength={8}
              maxLength={72}
            />

            <button type="submit" className="--btn --btn-primary --btn-block">
              Reset Password
            </button>
            <div className={styles.links}>
              <p>
                <Link to="/">- Home</Link>
              </p>
              <p>
                <Link to="/login">- Login</Link>
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Reset;

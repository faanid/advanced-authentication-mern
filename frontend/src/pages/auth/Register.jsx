import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TiUserAddOutline } from "react-icons/ti";
import styles from "./auth.module.scss";
import Card from "../../components/card/Card";
import PasswordInput from "../../components/passwordInput/PasswordInput";
import { toast } from "react-toastify";
import { validateEmail } from "../../redux/features/auth/authService";
import { validatePassword } from "../../utils/authValidation";
import { useDispatch, useSelector } from "react-redux";
import {
  RESET,
  register,
  sendVerificationEmail,
} from "../../redux/features/auth/authSlice";
import Loader from "../../components/Loader/Loader";

const initialState = {
  name: "",
  email: "",
  password: "",
  password2: "",
};

const Register = () => {
  const [formData, setFormData] = useState(initialState);
  const { name, email, password, password2 } = formData;

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isLoading, isLoggedIn, isSuccess } = useSelector(
    (state) => state.auth
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const registerUser = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      return toast.error("All fields are required");
    }
    if (!validatePassword(password)) {
      return toast.error("Use at least 8 characters and stay within the 72-byte password limit");
    }
    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email");
    }
    if (password !== password2) {
      return toast.error("Passwords do not match");
    }

    const userData = { name, email, password };
    const result = await dispatch(register(userData));
    if (register.fulfilled.match(result)) {
      await dispatch(sendVerificationEmail());
    }
  };

  useEffect(() => {
    if (isSuccess && isLoggedIn) {
      navigate("/profile");
    }

    dispatch(RESET());
  }, [isLoggedIn, isSuccess, dispatch, navigate]);

  return (
    <div className={`container ${styles.auth}`}>
      {isLoading && <Loader />}
      <Card>
        <div className={styles.form}>
          <div className="--flex-center">
            <TiUserAddOutline size={35} color="#999" />
          </div>
          <h2>Register</h2>

          <form onSubmit={registerUser}>
            <input
              type="text"
              placeholder="Name"
              required
              name="name"
              value={name}
              onChange={handleInputChange}
            />
            <input
              type="email"
              placeholder="Email"
              required
              name="email"
              value={email}
              onChange={handleInputChange}
            />

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
            
            <Card cardClass={styles.group}>
              <p className={styles.indicator}>
                Use at least 8 characters. Passwords are limited to 72 UTF-8 bytes.
              </p>
            </Card>
            <button type="submit" className="--btn --btn-primary --btn-block">
              Register
            </button>
          </form>

          <span className={styles.register}>
            <Link to="/">Home</Link>
            <p> &nbsp; Already have an account? &nbsp;</p>
            <Link to="/login">Login</Link>
          </span>
        </div>
      </Card>
    </div>
  );
};

export default Register;

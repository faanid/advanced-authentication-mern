import React, { useState } from "react";
import { Link } from "react-router-dom";
import { BiLogIn } from "react-icons/bi";
import styles from "./auth.module.scss";
import Card from "../../components/card/Card";
import PasswordInput from "../../components/passwordInput/PasswordInput";
import { AiOutlineMail } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { forgotPassword, RESET } from "../../redux/features/auth/authSlice";
import { validateEmail } from "../../redux/features/auth/authService";
import { toast } from "react-toastify";
import Loader from "../../components/Loader/Loader";

const Forgot = () => {
  const [email, setEmail] = useState("");
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  const forgot = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter an email");
    }
    if (!validateEmail(email)) {
      return toast.error("Please enter a valid email");
    }
    const userData = {
      email,
    };

    await dispatch(forgotPassword(userData));
    await dispatch(RESET(userData));
  };

  return (
    <div className={`container ${styles.auth}`}>
      {isLoading && <Loader />}
      <Card>
        <div className={styles.form}>
          <div className="--flex-center">
            <AiOutlineMail size={35} color="#999" />
          </div>
          <h2>ّForgot Password</h2>

          <form onSubmit={forgot}>
            <input
              type="email"
              placeholder="Email"
              required
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <button type="submit" className="--btn --btn-primary --btn-block">
              Get Reset Email
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

export default Forgot;

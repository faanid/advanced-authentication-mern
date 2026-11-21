import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GrInsecure } from "react-icons/gr";
import styles from "./auth.module.scss";
import Card from "../../components/card/Card";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  loginWithCode,
  RESET,
  sendLoginCode,
} from "../../redux/features/auth/authSlice";
import Loader from "../../components/Loader/Loader";

const LoginWithCode = () => {
  const [loginCode, setLoginCode] = useState("");
  const location = useLocation();
  const email = location.state?.email || "";
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isLoading, isLoggedIn, isSuccess } = useSelector(
    (state) => state.auth
  );

  const sendUserLoginCode = async () => {
    try {
      await dispatch(sendLoginCode(email)).unwrap();
    } catch (error) {
      return;
    }
  };

  const loginUserWithCode = async (e) => {
    e.preventDefault();

    if (loginCode === "") {
      return toast.error("Please fill in the login code");
    }
    if (loginCode.length !== 6) {
      return toast.error("Access code must be 6 characters");
    }

    await dispatch(loginWithCode({ loginCode, email }));
  };

  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    if (isSuccess && isLoggedIn) {
      navigate("/profile");
    }

    dispatch(RESET());
  }, [email, isLoggedIn, isSuccess, dispatch, navigate]);

  return (
    <div className={`container ${styles.auth}`}>
      {isLoading && <Loader />}
      <Card>
        <div className={styles.form}>
          <div className="--flex-center">
            <GrInsecure size={35} color="#999" />
          </div>
          <h2>Enter Access Code</h2>

          <form onSubmit={loginUserWithCode}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="Access Code"
              required
              name="accessCode"
              value={loginCode}
              onChange={(e) => setLoginCode(sanitizeLoginCode(e.target.value))}
            />

            <button type="submit" className="--btn --btn-primary --btn-block">
              Proceed To Login
            </button>
            <span className="--flex-center">
              Check your email for login access code
            </span>
            <div className={styles.links}>
              <p>
                <Link to="/">- Home</Link>
              </p>
              <p onClick={sendUserLoginCode} className="v-link --color-primary">
                <b>Resend Code</b>
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default LoginWithCode;

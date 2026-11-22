import React from "react";
import "./Header.scss";
import { BiLogInCircle } from "react-icons/bi";
import { FaUserCircle } from "react-icons/fa";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout, RESET } from "../../redux/features/auth/authSlice";
import { ShowOnLogin, ShowOnLogout } from "../protect/hiddenLink";
import UserName from "../userName/UserName";

const activeLink = ({ isActive }) => (isActive ? "active" : "");

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const goHome = () => {
    navigate("/");
  };

  const logoutUser = async () => {
    try {
      await dispatch(logout()).unwrap();
      dispatch(RESET());
      navigate("/login");
    } catch (error) {
      return;
    }
  };

  return (
    <header className="header">
      <nav>
        <div className="logo" onClick={goHome}>
          <BiLogInCircle size={35} />
          <span>AUTH:F</span>
        </div>
        <ul className="home-links">
          <ShowOnLogin>
            <li className="--flex-center">
              <FaUserCircle size={20} />
              <UserName />
            </li>
          </ShowOnLogin>
          <ShowOnLogout>
            <li>
              <Link to="/login" className="--btn --btn-primary">
                Login
              </Link>
            </li>
          </ShowOnLogout>
          <ShowOnLogin>
            <li>
              <NavLink to="/profile" className={activeLink}>
                Profile
              </NavLink>
            </li>
            <li>
              <button onClick={logoutUser} className="--btn --btn-secondary">
                Logout
              </button>
            </li>
          </ShowOnLogin>
        </ul>
      </nav>
    </header>
  );
};

export default Header;

import React from "react";
import "./Home.scss";
import loginImg from "../../assets/login.svg";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div>
      <section className="container hero">
        <div className="hero-text">
          <h2>Ultimate MERN Stack Authentication System</h2>
          <p>
            learn and master authentication and authorization using mern stack.
          </p>
          <p>
            implement user regisration login password reser social login user
            permissions email notiication
          </p>
          <div className="hero-buttons --flex-start">
            <button className="--btn --btn-danger">
              <Link to="/register">Register</Link>
            </button>
            <button className="--btn --btn-primary">
              <Link to="/login">Login</Link>
            </button>
          </div>
        </div>
        <div className="hero-image">
          <img src={loginImg} alt="Auth" />
        </div>
      </section>
    </div>
  );
};

export default Home;

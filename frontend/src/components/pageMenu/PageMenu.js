import React from "react";
import { Link, NavLink } from "react-router-dom";
import { AdminAuthorLink } from "../protect/hiddenLink";

function PageMenu() {
  return (
    <div>
      <nav classNme="-btn-google --p --mb">
        <ul className="home-links">
          <li>
            <NavLink to="/profile">Profile</NavLink>
          </li>
          <li>
            <NavLink to="/changePassword">Change Password</NavLink>
          </li>
          <AdminAuthorLink>
            <li>
              <NavLink to="/users">Users</NavLink>
            </li>
          </AdminAuthorLink>
        </ul>
      </nav>
    </div>
  );
}

export default PageMenu;

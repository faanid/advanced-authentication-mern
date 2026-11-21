import React, { useState } from "react";
import { FaCheck } from "react-icons/fa";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import { getUsers, upgradeUser } from "../../redux/features/auth/authSlice";
import {
  EMAIL_RESET,
  sendAutomatedEmail,
} from "../../redux/features/email/emailSlice";

function ChangeRole({ _id }) {
  const [userRole, setUserRole] = useState("");
  const dispatch = useDispatch();

  const changeRole = async (event) => {
    event.preventDefault();

    if (!userRole) {
      toast.error("Please select a role");
      return;
    }

    try {
      await dispatch(upgradeUser({ role: userRole, id: _id })).unwrap();
      await dispatch(sendAutomatedEmail({ id: _id, role: userRole })).unwrap();
      await dispatch(getUsers()).unwrap();
      dispatch(EMAIL_RESET());
    } catch (error) {
      toast.error(typeof error === "string" ? error : "Unable to update user role");
    }
  };

  return (
    <div className="sort">
      <form className="--flex-start" onSubmit={changeRole}>
        <select value={userRole} onChange={(event) => setUserRole(event.target.value)}>
          <option value="">-- select --</option>
          <option value="subscriber">Subscriber</option>
          <option value="author">Author</option>
          <option value="admin">Admin</option>
          <option value="suspended">Suspended</option>
        </select>
        <button type="submit" className="--btn --btn-primary">
          <FaCheck size={15} />
        </button>
      </form>
    </div>
  );
}

export default ChangeRole;

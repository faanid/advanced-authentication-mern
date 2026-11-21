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
      const updateResult = await dispatch(
        upgradeUser({ role: userRole, id: _id })
      );

      if (updateResult.meta.requestStatus !== "fulfilled") {
        return;
      }

      setUserRole("");
      await dispatch(getUsers());
      await dispatch(sendAutomatedEmail({ id: _id, role: userRole }));
    } finally {
      dispatch(EMAIL_RESET());
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

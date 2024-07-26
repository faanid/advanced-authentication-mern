import React, { useState } from "react";
import { FaCheck } from "react-icons/fa";

function ChangeRole({ id, email }) {
  const [userRole, setUserRole] = useState("");

  //Upgrade user
  const changeRole = async () => {};

  // video 115 daghighe 03:46

  return (
    <div className="sort">
      <form className="--flex-start" onSubmit={changeRole}>
        <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
          <option value="">-- select --</option>
          <option value="subscriber"> Subscriber</option>
          <option value="author"> Author</option>
          <option value="admin"> Admin</option>
          <option value="suspended"> Suspended</option>
        </select>
        <button className="--btn --btn-primary ">
          <FaCheck size={15} />
        </button>
      </form>
    </div>
  );
}

export default ChangeRole;

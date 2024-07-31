import React, { useEffect, useState } from "react";
import "./UserList.scss";
import PageMenu from "../../components/pageMenu/PageMenu";
import UserStats from "../../components/userStats/UserStats";
import Search from "../../components/search/Search";
import { FaTrashAlt } from "react-icons/fa";
import ChangeRole from "../../components/ChangeRole/ChangeRole";
import { useDispatch, useSelector } from "react-redux";
import useRedirectLoggedOutUSer from "../../customHook/useRedirectLoggedOutUser";
import { deleteUsers, getUsers } from "../../redux/features/auth/authSlice";
import { shortenText } from "../profile/Profile";
import Loader, { Spinner } from "../../components/Loader/Loader";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {
  FILTER_USERS,
  selectUser,
} from "../../redux/features/auth/filterSlice";

function UserList() {
  useRedirectLoggedOutUSer("/login");

  const [search, setSearch] = useState("");
  const dispatch = useDispatch();

  const { users, isLoading, isLoggedIn, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  const filteredUsers = useSelector(selectUser);
  useEffect(() => {
    dispatch(getUsers());
  }, [dispatch]);

  const removeUser = async (id) => {
    await dispatch(deleteUsers(id));
    dispatch(getUsers());
  };

  const confirmDelete = (id) => {
    confirmAlert({
      title: "Delete This User",
      message: "Are you sure to delete this user?",
      buttons: [
        {
          label: "Delete",
          onClick: () => removeUser(id),
        },
        {
          label: "Cancel",
          // onClick: () => alert("Click No"),
        },
      ],
    });
  };

  useEffect(() => {
    dispatch(FILTER_USERS({ users, search }));
  }, [dispatch, users, search]);

  return (
    <section>
      <div className="container">
        <PageMenu />
        {/* <UserStats /> */}

        <div className="user-list">
          {isLoading && <Spinner />}
          <div className="table">
            <div className="--flex-between">
              <span>
                <h3>All Users</h3>
              </span>
              <span>
                <Search
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </span>
            </div>
            {/* Table */}
            {!isLoading && users.length === 0 ? (
              <p>No user found...</p>
            ) : (
              <div>
                <table>
                  <thead>
                    <tr>
                      <th>s/n</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Change Role</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => {
                      const { _id, name, email, role } = user;
                      return (
                        <tr key={_id}>
                          <td>{index + 1}</td>
                          <td>{shortenText(name, 8)}</td>
                          <td>{email}</td>
                          <td>{role}</td>
                          <td>
                            <ChangeRole _id={_id} email={email} />
                          </td>
                          <td>
                            <span>
                              <FaTrashAlt
                                size={20}
                                color="red"
                                onClick={() => confirmDelete(_id)}
                              />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default UserList;

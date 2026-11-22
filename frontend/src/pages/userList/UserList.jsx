import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./UserList.scss";
import PageMenu from "../../components/pageMenu/PageMenu";
import UserStats from "../../components/userStats/UserStats";
import Search from "../../components/search/Search";
import { FaTrashAlt } from "react-icons/fa";
import ChangeRole from "../../components/ChangeRole/ChangeRole";
import { useDispatch, useSelector } from "react-redux";
import useRedirectLoggedOutUser from "../../hooks/useRedirectLoggedOutUser";
import { deleteUsers, getUsers } from "../../redux/features/auth/authSlice";
import { shortenText } from "../../utils/formatText";
import { Spinner } from "../../components/Loader/Loader";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {
  FILTER_USERS,
  selectUser,
} from "../../redux/features/auth/filterSlice";
import ReactPaginate from "react-paginate";

function UserList() {
  useRedirectLoggedOutUser("/login");

  const [search, setSearch] = useState("");
  const [itemOffset, setItemOffset] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.auth.user);

  const { users, isLoading } = useSelector(
    (state) => state.auth
  );

  const filteredUsers = useSelector(selectUser);
  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      navigate("/profile", { replace: true });
      return;
    }

    if (currentUser?.role === "admin") {
      dispatch(getUsers());
    }
  }, [currentUser, dispatch, navigate]);

  const removeUser = async (id) => {
    try {
      await dispatch(deleteUsers(id)).unwrap();
      await dispatch(getUsers()).unwrap();
    } catch (error) {
      return;
    }
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
        },
      ],
    });
  };

  useEffect(() => {
    dispatch(FILTER_USERS({ users, search }));
    setItemOffset(0);
  }, [dispatch, users, search]);

  const itemsPerPage = 5;
  const endOffset = itemOffset + itemsPerPage;
  const currentItems = filteredUsers.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

  return (
    <section>
      <div className="container">
        <PageMenu />
        <UserStats />

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
                    {currentItems.map((user, index) => {
                      const { _id, name, email, role } = user;
                      return (
                        <tr key={_id}>
                          <td>{itemOffset + index + 1}</td>
                          <td>{shortenText(name, 8)}</td>
                          <td>{email}</td>
                          <td>{role}</td>
                          <td>
                            <ChangeRole _id={_id} />
                          </td>
                          <td>
                            <span>
                              <button
                                type="button"
                                className="--btn --btn-danger"
                                aria-label={`Delete ${name}`}
                                onClick={() => confirmDelete(_id)}
                              >
                                <FaTrashAlt size={18} />
                              </button>
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
          <hr />
          <ReactPaginate
            breakLabel="..."
            nextLabel="Next"
            onPageChange={handlePageClick}
            pageRangeDisplayed={3}
            pageCount={pageCount}
            previousLabel="Prev"
            renderOnZeroPageCount={null}
            containerClassName="pagination"
            pageLinkClassName="page-num"
            previousLinkClassName="page-num"
            nextLinkClassName="page-num"
            activeLinkClassName="activePage"
          />
        </div>
      </div>
    </section>
  );
}

export default UserList;

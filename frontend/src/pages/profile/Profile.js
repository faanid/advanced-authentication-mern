import React, { useEffect, useState } from "react";
import Card from "../../components/card/Card";
import profileImg from "../../assets/avatarr.png";
import "./Profile.scss";
import PageMenu from "../../components/pageMenu/PageMenu";
import useRedirectLoggedOutUSer from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { getUser } from "../../redux/features/auth/authSlice";
import Loader from "../../components/Loader/Loader";
import UserStats from "../../components/userStats/UserStats";

function Profile() {
  useRedirectLoggedOutUSer("/login");
  const dispatch = useDispatch();
  const { isLoading, isLoggedIn, isSuccess, message, user } = useSelector(
    (state) => state.auth
  );
  const initialState = {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    photo: user?.photo || "",
    role: user?.role || "",
    isVerified: user?.isVerified || false,
  };
  const [profile, setProfile] = useState(initialState);
  const [profileImage, setProfileImage] = useState(initialState);
  const [imagePreview, setImagePreview] = useState(initialState);

  useEffect(() => {
    //whenever the page load, it will just get the user
    dispatch(getUser());
  }, [dispatch]);

  const handleImageChange = (e) => {
    setProfileImage(e.target.file[0]);
    setImagePreview(URL.createObjectURL(e.target.file[0]));
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };
  return (
    <section>
      <div className="container">
        {isLoading && <Loader />}
        <PageMenu />
        <h2>Profile</h2>
        <div className="--flex-start profile">
          <Card cardClass={"card"}>
            <>
              <div className="profile-photo">
                <div>
                  <img
                    src={imagePreview === null ? user?.photo : imagePreview}
                    alt="Profileimg"
                  />
                  <h3>Role: {profile.role}</h3>
                </div>
              </div>
              <form>
                <p>
                  <label>Change Photo:</label>
                  <input
                    type="file"
                    accept="image/*"
                    name="image"
                    onChange={handleImageChange}
                  />
                </p>
                <p>
                  <label>Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={profile?.name}
                    onChange={handleInputChange}
                  />
                </p>
                <p>
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={profile?.email}
                    onChange={handleInputChange}
                    disabled
                  />
                </p>
                <p>
                  <label>Phone:</label>
                  <input
                    type="text"
                    name="phone"
                    value={profile?.phone}
                    onChange={handleInputChange}
                  />
                </p>
                <p>
                  <label>Bio:</label>
                  <textarea
                    name="bio"
                    value={profile?.bio}
                    onChange={handleInputChange}
                    cols="30"
                    rows="10"
                  ></textarea>
                </p>
                <button className="--btn --btn-primary --btn-block">
                  Update Profile
                </button>
              </form>
            </>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default Profile;

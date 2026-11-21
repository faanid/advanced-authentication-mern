import React, { useEffect, useState } from "react";
import Card from "../../components/card/Card";
import "./Profile.scss";
import PageMenu from "../../components/pageMenu/PageMenu";
import useRedirectLoggedOutUSer from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import {
  getUser,
  selectUser,
  updateUser,
} from "../../redux/features/auth/authSlice";
import Loader from "../../components/Loader/Loader";
import { toast } from "react-toastify";
import Notification from "../../components/notification/Notification";

const cloud_name = process.env.REACT_APP_CLOUD_NAME;
const upload_preset = process.env.REACT_APP_UPLOAD_PRESET;

export const shortenText = (text, n) => {
  if (text.length > n) {
    const shortenendText = text.substring(0, n).concat("...");
    return shortenendText;
  }
  return text;
};

function Profile() {
  useRedirectLoggedOutUSer("/login");
  const dispatch = useDispatch();
  const { isLoading, user } = useSelector(
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
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    //whenever the page load, it will just get the user
    dispatch(getUser());
  }, [dispatch]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please select a JPEG, PNG, or WebP image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be 5 MB or less");
      return;
    }

    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    let imageURL;

    try {
      if (
        profileImage !== null &&
        (profileImage.type === "image/jpeg" ||
          profileImage.type === "image/jpg" ||
          profileImage.type === "image/png")
      ) {
        if (!cloud_name || !upload_preset) {
          throw new Error("Cloudinary upload configuration is missing");
        }

        const image = new FormData();
        image.append("file", profileImage);
        image.append("upload_preset", upload_preset);

        const response = await fetch(
          "https://api.cloudinary.com/v1_1/" + cloud_name + "/image/upload",
          { method: "POST", body: image }
        );
        const imgData = await response.json();

        if (!response.ok || !imgData.secure_url) {
          throw new Error(imgData.error?.message || "Image upload failed");
        }

        imageURL = imgData.secure_url;
      }
      // Save profile to MongoD
      const userData = {
        name: profile.name,
        phone: profile.phone,
        bio: profile.bio,
        photo: profileImage ? imageURL : profile.photo,
      };

      const updatedUser = await dispatch(updateUser(userData)).unwrap();
      setProfile((currentProfile) => ({ ...currentProfile, ...updatedUser }));
      setProfileImage(null);
      setImagePreview(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    if (!user) return;

    setProfile((currentProfile) => ({
      ...currentProfile,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photo: user.photo,
      bio: user.bio,
      role: user.role,
      isVerified: user.isVerified,
    }));
  }, [user]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  return (
    <>
      {isLoading && <Loader />}
      {!profile.isVerified && <Notification />}
      <section>
        <div className="container">
          <PageMenu />
          <h2>Profile</h2>
          <div className="--flex-start profile">
            <Card cardClass={"card"}>
              {!isLoading && user && (
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
                  <form onSubmit={saveProfile}>
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
              )}
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}

export const UserName = () => {
  const user = useSelector(selectUser);

  const username = user?.name || "...";
  return <p className="--color-white">Hi, {shortenText(username, 9)} |</p>;
};

export default Profile;

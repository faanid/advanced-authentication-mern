import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  selectAuthChecked,
  selectIsLoggedIn,
} from "../redux/features/auth/authSlice";

const useRedirectLoggedOutUser = (path) => {
  const navigate = useNavigate();
  const authChecked = useSelector(selectAuthChecked);
  const isLoggedIn = useSelector(selectIsLoggedIn);

  useEffect(() => {
    if (!authChecked || isLoggedIn) {
      return;
    }

    toast.info("Session expired, please login to continue");
    navigate(path, { replace: true });
  }, [authChecked, isLoggedIn, navigate, path]);
};

export default useRedirectLoggedOutUser;

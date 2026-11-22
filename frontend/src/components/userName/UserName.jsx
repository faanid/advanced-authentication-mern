import { useSelector } from "react-redux";
import { shortenText } from "../../utils/formatText";

const UserName = () => {
  const user = useSelector((state) => state.auth.user);
  const username = user?.name || "...";

  return <p className="--color-white">Hi, {shortenText(username, 9)} |</p>;
};

export default UserName;

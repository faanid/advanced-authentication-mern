export const shortenText = (value, maxLength) => {
  if (typeof value !== "string") {
    return "";
  }

  if (!Number.isInteger(maxLength) || maxLength < 0) {
    return value;
  }

  return value.length > maxLength
    ? `${value.slice(0, maxLength)}...`
    : value;
};

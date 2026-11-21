import React from "react";
import Header from "../header/Header";
import Footer from "../footer/Footer";

const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <div className="--pad" style={{ minHeight: "80vh" }}>
        {children}
      </div>
      <Footer />
    </>
  );
};

export default Layout;

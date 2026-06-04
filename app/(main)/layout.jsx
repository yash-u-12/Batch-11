export const dynamic = "force-dynamic";

import React from "react";

const MainLayout = ({ children }) => {
  return <div className="container mx-auto my-20">{children}</div>;
};

export default MainLayout;

import React from "react";

export const AppLayout = ({ children }) => {
  return (
    <div
      className="w-full h-[100svh] min-h-[100svh] max-w-full overflow-hidden flex flex-col bg-[#07012c]"
    >
      {children}
    </div>
  );
};

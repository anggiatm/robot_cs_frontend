import React, { createContext, useState } from "react";

export const RobotIpContext = createContext();

export const RobotIpProvider = ({ children }) => {
  const [robotIp, setRobotIp] = useState(
    localStorage.getItem("robot_ip") || "localhost"
  );

  return (
    <RobotIpContext.Provider value={{ robotIp, setRobotIp }}>
      {children}
    </RobotIpContext.Provider>
  );
};

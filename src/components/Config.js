import React, { useContext, useState } from "react";
import { RobotIpContext } from "./RobotIpContext";

const Config = () => {
  const { robotIp, setRobotIp } = useContext(RobotIpContext);
  const [inputValue, setInputValue] = useState(robotIp);

  const handleSave = () => {
    if (!inputValue) {
      alert("Robot IP cannot be empty!");
      return;
    }

    setRobotIp(inputValue);
    localStorage.setItem("robot_ip", inputValue);
    alert("Robot IP saved successfully!");
  };

  return (
    <div>
      <h1>Config Page</h1>
      <p>Current Robot IP: {robotIp || "Not set yet."}</p>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Enter Robot IP"
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
};

export default Config;

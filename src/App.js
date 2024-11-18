import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { RobotIpProvider } from "./components/RobotIpContext";
import Panel from "./components/Panel";
import Config from "./components/Config";

const App = () => {
  return (
    <RobotIpProvider>
      <Router>
        <nav>
          <Link to="/">Panel</Link>
          {" | "}
          <Link to="/config">Config</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Panel />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </Router>
    </RobotIpProvider>
  );
};

export default App;

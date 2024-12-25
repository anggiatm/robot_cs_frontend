import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { RobotIpProvider } from "./components/RobotIpContext";
import Panel from "./components/Panel";
import Panel2 from "./components/Panel2";
import Config from "./components/Config";

const App = () => {
  return (
    <RobotIpProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}>
        <Routes>
          <Route path="/" element={<Panel2 />} />
          <Route path="/config" element={<Config />} />
        </Routes>
        <nav>
          <Link to="/">Panel</Link>
          <Link to="/config">Config</Link>
        </nav>
      </Router>
    </RobotIpProvider>
  );
};

export default App;

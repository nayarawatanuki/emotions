import React from "react";
import Home from "./frontend/pages/Home/index";
import KidProvider from "./frontend/context/kidContext";

import "./frontend/global/styles/style.css";

function App() {
  return (
    <KidProvider>
      <Home />
    </KidProvider>
  );
}

export default App;
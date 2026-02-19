import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { initPerformanceMonitoring } from "./utils/performance";

// Initialize performance monitoring
if (import.meta.env.PROD) {
  initPerformanceMonitoring();
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

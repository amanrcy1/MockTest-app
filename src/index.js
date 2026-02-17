import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { initPerformanceMonitoring } from "./utils/performance";

// Initialize performance monitoring
if (process.env.NODE_ENV === 'production') {
  initPerformanceMonitoring();
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Silent fail — SW registration is optional
    });
  });
}

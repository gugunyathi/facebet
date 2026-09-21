import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App";
import "./index.css";

// Prevent unhandled promise rejections from surfacing error overlays
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
);

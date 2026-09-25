// Defensive polyfill shim for window.fetch property setters in browser environments
if (typeof window !== "undefined") {
  try {
    let _fetch = window.fetch ? window.fetch.bind(window) : undefined;
    Object.defineProperty(window, "fetch", {
      configurable: true,
      enumerable: true,
      get() {
        return _fetch;
      },
      set(fn) {
        _fetch = fn;
      },
    });
  } catch (e) {
    console.warn("Could not redefine window.fetch property:", e);
  }

  // Prevent unhandled promise rejections from surfacing error overlays
  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
  });
}

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
);

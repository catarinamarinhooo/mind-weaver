import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logout } from "./lib/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const requestUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  const shouldAttachToken = requestUrl.startsWith(API_URL);
  const response = await originalFetch(input, {
    ...init,
    credentials: shouldAttachToken ? "include" : init?.credentials,
  });

  if (response.status === 401 && shouldAttachToken && !requestUrl.includes("/auth/")) {
    logout();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
};

createRoot(document.getElementById("root")!).render(<App />);

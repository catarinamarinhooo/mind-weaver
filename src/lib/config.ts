export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl && configuredUrl.trim()) {
    return configuredUrl.trim().replace(/\/$/, "");
  }

  if (typeof window !== "undefined" && window.location.origin) {
    const isLocalFrontend =
      window.location.port === "8080" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "localhost";

    if (!isLocalFrontend) {
      return window.location.origin;
    }
  }

  return "http://localhost:8000";
}

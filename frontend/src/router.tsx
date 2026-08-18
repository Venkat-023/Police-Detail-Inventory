import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Check local storage for dark mode preference
  const darkModePreference = localStorage.getItem("darkMode");
  if (darkModePreference === "true") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }

  // Listen for changes in dark mode preference
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", event => {
    if (event.matches) {
      document.body.classList.add("dark");
      localStorage.setItem("darkMode", "true");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("darkMode", "false");
    }
  });

  return router;
};
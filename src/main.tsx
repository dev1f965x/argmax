import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { ListsProvider } from "./components/lists-provider";
import "./index.css";
import "./i18n";
import { browserStorage, createRepository } from "./lib/storage";
import { router } from "./router";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <ListsProvider repository={createRepository(browserStorage)}>
      <RouterProvider router={router} />
    </ListsProvider>
  </StrictMode>,
);

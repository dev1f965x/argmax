import { createBrowserRouter } from "react-router";
import { ListPage } from "@/routes/list-page";
import { ListsPage } from "@/routes/lists-page";
import { NotFoundPage } from "@/routes/not-found-page";
import { RootLayout } from "@/routes/root-layout";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      { index: true, Component: ListsPage },
      { path: "lists/:id", Component: ListPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
]);

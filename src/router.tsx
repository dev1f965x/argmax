import type { RouteObject } from "react-router";
import { ListPage } from "@/routes/list-page";
import { ListsPage } from "@/routes/lists-page";
import { NotFoundPage } from "@/routes/not-found-page";
import { PrivacyPage } from "@/routes/privacy-page";
import { RootLayout } from "@/routes/root-layout";
import { SharedPage } from "@/routes/shared-page";

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    children: [
      { index: true, Component: ListsPage },
      { path: "lists/:id", Component: ListPage },
      { path: "privacy", Component: PrivacyPage },
      { path: "shared", Component: SharedPage },
      { path: "*", Component: NotFoundPage },
    ],
  },
];

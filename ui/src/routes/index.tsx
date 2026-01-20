import type { ComponentType } from "react";
import { createBrowserRouter, redirect } from "react-router";

const lazy =
  (importFn: () => Promise<{ default: ComponentType }>) => async () => {
    const { default: Component } = await importFn();
    return { Component };
  };

export const router = createBrowserRouter([
  {
    path: "/",
    lazy: lazy(() => import("@/features/dashboard/pages/dashboard-page")),
  },
  {
    path: "/settings",
    loader: () => redirect("/settings/clis"),
  },
  {
    path: "/settings/clis",
    lazy: lazy(() => import("@/features/settings/pages/clis-page")),
  },
]);

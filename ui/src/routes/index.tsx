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
    loader: () => redirect("/workspaces"),
  },
  // Workspaces
  {
    path: "/workspaces",
    lazy: lazy(() => import("@/features/workspaces/pages/workspaces-page")),
  },
  // Settings
  {
    path: "/settings",
    loader: () => redirect("/settings/clis"),
  },
  {
    path: "/settings/clis",
    lazy: lazy(() => import("@/features/settings/pages/clis-page")),
  },
]);

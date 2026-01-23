import "./styles/globals.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";

import { ServerPropsProvider } from "@/components/server-props-provider.tsx";
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { queryClient } from "@/lib/query-client.ts";

import { router } from "./routes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ServerPropsProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
        </ThemeProvider>
      </ServerPropsProvider>
    </QueryClientProvider>
  </StrictMode>,
);

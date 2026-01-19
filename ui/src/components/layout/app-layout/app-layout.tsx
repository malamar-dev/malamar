import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-layout/app-header.tsx";
import { AppSidebar } from "@/components/layout/app-layout/app-sidebar.tsx";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />

        <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
};

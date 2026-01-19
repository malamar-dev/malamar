import { CommandIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";

import { AppSidebarMain } from "@/components/layout/app-layout/app-sidebar-main.tsx";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <CommandIcon className="size-4" />
                </div>

                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Malamar</span>
                  <span className="text-muted-foreground truncate text-xs">
                    Standalone
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <AppSidebarMain />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" asChild>
              <Link
                to="https://github.com/irvingdinh"
                target="_blank"
                className="text-muted-foreground justify-center"
              >
                A project of Irving Dinh
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

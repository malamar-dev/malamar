import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { AppHeader } from "@/components/layout/app-layout/app-header.tsx";
import { AppSidebar } from "@/components/layout/app-layout/app-sidebar.tsx";
import type { BreadcrumbItemType } from "@/components/layout/app-layout/types.ts";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils.ts";

const appLayoutVariants = cva("mx-auto w-full", {
  variants: {
    variant: {
      fluid: "",
      md: "max-w-7xl p-4",
      sm: "max-w-xl p-4",
    },
  },
  defaultVariants: {
    variant: "md",
  },
});

interface AppLayoutProps
  extends React.ComponentProps<"div">, VariantProps<typeof appLayoutVariants> {
  breadcrumbItems?: BreadcrumbItemType[];
}

export const AppLayout = ({
  breadcrumbItems,
  variant,
  className,
  ...props
}: AppLayoutProps) => {
  const { children, ...otherProps } = props;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader breadcrumbItems={breadcrumbItems} />

        <div
          className={cn(appLayoutVariants({ variant, className }))}
          {...otherProps}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

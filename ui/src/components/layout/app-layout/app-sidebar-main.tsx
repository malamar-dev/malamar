import {
  ChevronRightIcon,
  Settings2Icon,
  SquareTerminalIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible.tsx";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar.tsx";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: SquareTerminalIcon,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings2Icon,
    items: [
      {
        title: "CLIs",
        url: "/settings/clis",
      },
    ],
  },
];

function shouldDefaultOpened(pathname: string, item: (typeof items)[number]) {
  if (
    item.items?.some(
      (subItem) =>
        subItem.url !== "#" &&
        subItem.url !== "/" &&
        pathname.startsWith(subItem.url),
    )
  ) {
    return true;
  }

  return item.url !== "#" && item.url !== "/" && pathname.startsWith(item.url);
}

export const AppSidebarMain = () => {
  const { pathname } = useLocation();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={shouldDefaultOpened(pathname, item)}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link to={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>

              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuAction className="data-[state=open]:rotate-90">
                      <ChevronRightIcon />
                      <span className="sr-only">Toggle</span>
                    </SidebarMenuAction>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <Link to={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
};

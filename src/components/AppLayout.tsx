import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, ChefHat, Package, ShoppingBag, Receipt, Box, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Orders", url: "/orders", icon: ShoppingBag },
  { title: "Recipes", url: "/recipes", icon: ChefHat },
  { title: "Ingredients", url: "/ingredients", icon: Package },
  { title: "Supplies", url: "/supplies", icon: Box },
  { title: "Expenses", url: "/expenses", icon: Receipt },
];

function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const collapsed = state === "collapsed";

  // Filter menu items based on role
  const visibleMenuItems = user?.role === "cake_topper_provider" 
    ? menuItems.filter(item => item.url === "/orders")
    : menuItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.url}>
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 sticky top-0 z-10 justify-between">
            <div className="flex items-center">
              <SidebarTrigger />
              <div className="ml-4 flex items-center gap-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Holy Moly Recipes</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  ({user?.role === "cake_topper_provider" ? "Topper Provider" : "Owner"})
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          <main className="flex-1 p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

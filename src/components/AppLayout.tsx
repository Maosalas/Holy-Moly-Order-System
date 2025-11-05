import { ReactNode, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, ChefHat, Package, ShoppingBag, Receipt, Box, LogOut, User, Calculator, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganization } from "@/contexts/OrganizationContext";
import defaultLogo from "@/assets/Orderly-logo.png";
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
  { title: "Pedidos", url: "/orders", icon: ShoppingBag },
  { title: "Cotizador", url: "/quotations", icon: Calculator },
  { title: "Recetas", url: "/recipes", icon: ChefHat },
  { title: "Ingredientes", url: "/ingredients", icon: Package },
  { title: "Suministros", url: "/supplies", icon: Box },
  { title: "Gastos", url: "/expenses", icon: Receipt },
];

function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const collapsed = state === "collapsed";

  // Filter menu items based on role
  const visibleMenuItems = user?.roles?.includes("cake_topper_provider")
    ? menuItems.filter(item => item.url === "/orders")
    : menuItems;

  const isSuperAdmin = user?.roles?.includes("super_admin");

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
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/super-admin"}>
                    <NavLink to="/super-admin">
                      <Shield className="h-5 w-5" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
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
  const { currentOrganization } = useOrganization();
  const logoSrc = currentOrganization?.logoUrl || defaultLogo || "";
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect super_admin users to super admin panel
  useEffect(() => {
    const isSuperAdmin = user?.roles?.includes("super_admin");
    if (isSuperAdmin && location.pathname !== "/super-admin") {
      navigate("/super-admin", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card flex items-center px-2 sm:px-4 sticky top-0 z-10 justify-between gap-2">
            <div className="flex items-center min-w-0">
              <SidebarTrigger />
              <div className="ml-2 sm:ml-4 flex items-center gap-2 min-w-0">
                <img src={logoSrc} alt="Organization Logo" className="h-8 sm:h-10 w-auto object-contain" />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <OrganizationSwitcher />
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium truncate">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  ({user?.roles?.includes("super_admin") ? "Admin" : user?.roles?.includes("cake_topper_provider") ? "Topper" : "Owner"})
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={logout} className="gap-1 sm:gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 bg-background overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

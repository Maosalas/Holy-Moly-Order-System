import { ReactNode, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, ChefHat, Package, ShoppingBag, Receipt, Box, LogOut, User, Calculator, Shield, Settings, Sliders, ChevronDown, Bell, Search, BarChart3, Warehouse } from "lucide-react";
import { useSubscriptionFeatures } from "@/hooks/use-subscription-features";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Elaboraciones", url: "/preparations", icon: ChefHat },
  { title: "Productos", url: "/products", icon: Package },
  { title: "Insumos", url: "/ingredients", icon: Package },
  { title: "Suministros", url: "/supplies", icon: Box },
  { title: "Compras", url: "/purchases", icon: Receipt },
  { title: "Cotizaciones", url: "/quotations", icon: Calculator },
  { title: "Pedidos", url: "/orders", icon: ShoppingBag },
];

function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, isImpersonating } = useAuth();
  const { hasFeatureAccess } = useSubscriptionFeatures();
  const collapsed = state === "collapsed";

  const isSuperAdmin = user?.roles?.includes("super_admin");
  const hasAnalytics = hasFeatureAccess('advanced_analytics');
  const hasInventory = hasFeatureAccess('inventory_alerts');
  
  // Filter menu items based on role and impersonation status
  let visibleMenuItems = menuItems;
  
  // If super admin is NOT impersonating, don't show organization menus
  if (isSuperAdmin && !isImpersonating) {
    visibleMenuItems = [];
  } 
  // If cake topper provider, only show orders
  else if (user?.roles?.includes("cake_topper_provider")) {
    visibleMenuItems = menuItems.filter(item => item.url === "/orders");
  }

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const hasSubmenu = 'submenu' in item && item.submenu;

                if (hasSubmenu) {
                  return (
                    <Collapsible key={item.title} asChild defaultOpen={false} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={item.title} className="hover:bg-muted/50">
                            <item.icon className="h-5 w-5" />
                            {!collapsed && <span>{item.title}</span>}
                            {!collapsed && <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={location.pathname === item.url}>
                                <NavLink to={item.url}>
                                  <span>Ver todas</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            {item.submenu.map((subItem: any) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton asChild isActive={location.pathname === subItem.url}>
                                  <NavLink to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} className="hover:bg-muted/50">
                      <NavLink to={item.url}>
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {hasInventory && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/inventory"} className="hover:bg-muted/50">
                    <NavLink to="/inventory">
                      <Warehouse className="h-5 w-5" />
                      {!collapsed && <span>Inventario</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {hasAnalytics && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/analytics"} className="hover:bg-muted/50">
                    <NavLink to="/analytics">
                      <BarChart3 className="h-5 w-5" />
                      {!collapsed && <span>Analytics</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/super-admin"} className="hover:bg-muted/50">
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
  const { user, logout, isImpersonating, stopImpersonation } = useAuth();
  const { currentOrganization } = useOrganization();
  const logoSrc = currentOrganization?.logoUrl || defaultLogo || "";
  const navigate = useNavigate();
  const location = useLocation();
  
  // Redirect super_admin users to super admin panel only if not impersonating
  useEffect(() => {
    const isSuperAdmin = user?.roles?.includes("super_admin");
    if (isSuperAdmin && !isImpersonating && location.pathname !== "/super-admin") {
      navigate("/super-admin", { replace: true });
    }
  }, [user, isImpersonating, location.pathname, navigate]);

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Shopify-style Topbar */}
          <header className="h-14 border-b border-border/60 bg-card sticky top-0 z-10 flex items-center px-4 gap-3">
            <SidebarTrigger className="-ml-2" />
            
            <div className="flex items-center gap-2 min-w-0">
              <img src={logoSrc} alt="Organization Logo" className="h-8 w-auto object-contain" />
            </div>

            <div className="flex-1 flex items-center gap-3 max-w-md ml-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 h-9 bg-muted/50 border-border/60 focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <OrganizationSwitcher />
              
              <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex">
                <Bell className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/user/settings")}
                className="h-9 w-9 hidden sm:flex"
              >
                <Settings className="h-4 w-4" />
              </Button>

              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <Button variant="ghost" size="sm" onClick={async () => {
                await logout();
                navigate("/");
              }} className="gap-2 hidden md:flex">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </header>

          {isImpersonating && (
            <div className="bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Impersonating: {currentOrganization?.name}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  stopImpersonation();
                  navigate("/super-admin");
                }}
                className="bg-white text-yellow-950 hover:bg-yellow-50"
              >
                Stop Impersonation
              </Button>
            </div>
          )}

          {/* Main content with Shopify-style background */}
          <main className="flex-1 p-6 bg-muted/30 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

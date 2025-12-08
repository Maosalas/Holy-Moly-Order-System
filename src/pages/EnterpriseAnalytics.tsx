import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureGuard } from "@/components/FeatureGuard";
import { useOrganization } from "@/contexts/OrganizationContext";
import { 
  useAnalyticsSummary, 
  useRevenueAnalytics, 
  useOrdersAnalytics, 
  useProductsAnalytics,
  useIngredientsAnalytics 
} from "@/hooks/use-analytics";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: 'up' | 'down';
  isLoading?: boolean;
}

function StatCard({ title, value, change, icon, trend, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(change).toFixed(1)}% vs mes anterior</span>
            </div>
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}

export default function EnterpriseAnalytics() {
  const { currentOrganization } = useOrganization();
  
  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary();
  const { data: revenue, isLoading: revenueLoading } = useRevenueAnalytics({ period: 'monthly' });
  const { data: orders, isLoading: ordersLoading } = useOrdersAnalytics();
  const { data: products, isLoading: productsLoading } = useProductsAnalytics();
  const { data: ingredients, isLoading: ingredientsLoading } = useIngredientsAnalytics();

  const isLoading = summaryLoading || revenueLoading || ordersLoading || productsLoading || ingredientsLoading;

  // Transform revenue data for chart
  const revenueChartData = revenue?.periodData?.map(item => ({
    date: formatDate(item.date),
    revenue: item.revenue,
    orders: item.orderCount,
  })) || [];

  // Transform sales by type for pie chart
  const categoryChartData = products?.salesByType?.map((item, index) => ({
    name: item.recipeType,
    value: item.count,
    color: CHART_COLORS[index % CHART_COLORS.length],
  })) || [];

  // Transform weekly trend for bar chart
  const weeklyChartData = orders?.weeklyTrend?.map(item => ({
    date: formatDate(item.date),
    orders: item.count,
  })) || [];

  // Transform ingredients for progress bars
  const ingredientUsageData = ingredients?.topIngredients?.slice(0, 5).map(item => {
    const maxUsage = ingredients.topIngredients[0]?.timesUsed || 1;
    return {
      name: item.ingredientName,
      usage: Math.round((item.timesUsed / maxUsage) * 100),
      totalUsed: item.totalUsed,
      unit: item.unit,
    };
  }) || [];

  return (
    <FeatureGuard 
      feature="advanced_analytics" 
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Analytics Avanzados</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Accede a métricas detalladas, gráficos de rendimiento y análisis de tu negocio 
            con el plan Professional o Enterprise.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Métricas y análisis detallados de {currentOrganization?.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Ingresos Totales"
            value={formatCurrency(summary?.revenue?.total || 0)}
            change={summary?.revenue?.growth || 0}
            trend={(summary?.revenue?.growth || 0) >= 0 ? "up" : "down"}
            icon={<DollarSign className="h-6 w-6 text-primary" />}
            isLoading={summaryLoading}
          />
          <StatCard
            title="Pedidos"
            value={formatNumber(summary?.orders?.total || 0)}
            change={summary?.orders?.growth || 0}
            trend={(summary?.orders?.growth || 0) >= 0 ? "up" : "down"}
            icon={<ShoppingCart className="h-6 w-6 text-primary" />}
            isLoading={summaryLoading}
          />
          <StatCard
            title="Clientes Activos"
            value={formatNumber(summary?.customers?.total || 0)}
            change={summary?.customers?.retention || 0}
            trend={(summary?.customers?.retention || 0) >= 0 ? "up" : "down"}
            icon={<Users className="h-6 w-6 text-primary" />}
            isLoading={summaryLoading}
          />
          <StatCard
            title="Productos Vendidos"
            value={formatNumber(summary?.products?.totalSold || 0)}
            change={0}
            trend="up"
            icon={<Package className="h-6 w-6 text-primary" />}
            isLoading={summaryLoading}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Ingresos Mensuales
              </CardTitle>
              <CardDescription>Evolución de ingresos en el período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChartData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Categoría</CardTitle>
              <CardDescription>Distribución de productos vendidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                {productsLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground">No hay datos disponibles</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Weekly Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Semanales</CardTitle>
              <CardDescription>Distribución de pedidos por día</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {ordersLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : weeklyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar 
                        dataKey="orders" 
                        fill="hsl(var(--primary))" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ingredient Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Uso de Ingredientes</CardTitle>
              <CardDescription>Top 5 ingredientes más utilizados</CardDescription>
            </CardHeader>
            <CardContent>
              {ingredientsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : ingredientUsageData.length > 0 ? (
                <div className="space-y-4">
                  {ingredientUsageData.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {item.totalUsed} {item.unit}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${item.usage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Pedidos</CardTitle>
            <CardDescription>Comparativa de pedidos en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {revenueLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGuard>
  );
}
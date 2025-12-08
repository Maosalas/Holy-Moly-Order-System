import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureGuard } from "@/components/FeatureGuard";
import { useOrganization } from "@/contexts/OrganizationContext";
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
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Package,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

// Demo data for charts
const revenueData = [
  { month: 'Ene', revenue: 4500, orders: 45 },
  { month: 'Feb', revenue: 5200, orders: 52 },
  { month: 'Mar', revenue: 4800, orders: 48 },
  { month: 'Abr', revenue: 6100, orders: 61 },
  { month: 'May', revenue: 5900, orders: 59 },
  { month: 'Jun', revenue: 7200, orders: 72 },
  { month: 'Jul', revenue: 6800, orders: 68 },
  { month: 'Ago', revenue: 7500, orders: 75 },
  { month: 'Sep', revenue: 8200, orders: 82 },
  { month: 'Oct', revenue: 7900, orders: 79 },
  { month: 'Nov', revenue: 9100, orders: 91 },
  { month: 'Dic', revenue: 10200, orders: 102 },
];

const categoryData = [
  { name: 'Pasteles', value: 35, color: 'hsl(var(--chart-1))' },
  { name: 'Cupcakes', value: 25, color: 'hsl(var(--chart-2))' },
  { name: 'Galletas', value: 20, color: 'hsl(var(--chart-3))' },
  { name: 'Pan', value: 12, color: 'hsl(var(--chart-4))' },
  { name: 'Otros', value: 8, color: 'hsl(var(--chart-5))' },
];

const weeklyOrders = [
  { day: 'Lun', orders: 12 },
  { day: 'Mar', orders: 19 },
  { day: 'Mié', orders: 15 },
  { day: 'Jue', orders: 22 },
  { day: 'Vie', orders: 28 },
  { day: 'Sáb', orders: 35 },
  { day: 'Dom', orders: 18 },
];

const ingredientUsage = [
  { name: 'Harina', usage: 85 },
  { name: 'Azúcar', usage: 72 },
  { name: 'Huevos', usage: 68 },
  { name: 'Mantequilla', usage: 55 },
  { name: 'Leche', usage: 45 },
];

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}

function StatCard({ title, value, change, icon, trend }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
              {trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              <span>{Math.abs(change)}% vs mes anterior</span>
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

export default function EnterpriseAnalytics() {
  const { currentOrganization } = useOrganization();

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
            value="$83,400"
            change={12.5}
            trend="up"
            icon={<DollarSign className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Pedidos"
            value="834"
            change={8.2}
            trend="up"
            icon={<ShoppingCart className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Clientes Activos"
            value="156"
            change={-2.4}
            trend="down"
            icon={<Users className="h-6 w-6 text-primary" />}
          />
          <StatCard
            title="Productos Vendidos"
            value="1,247"
            change={15.3}
            trend="up"
            icon={<Package className="h-6 w-6 text-primary" />}
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
              <CardDescription>Evolución de ingresos en el último año</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`$${value}`, 'Ingresos']}
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
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((entry, index) => (
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
              <CardDescription>Distribución de pedidos por día de la semana</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyOrders}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
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
              </div>
            </CardContent>
          </Card>

          {/* Ingredient Usage */}
          <Card>
            <CardHeader>
              <CardTitle>Uso de Ingredientes</CardTitle>
              <CardDescription>Top 5 ingredientes más utilizados (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ingredientUsage.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">{item.usage}%</span>
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
            </CardContent>
          </Card>
        </div>

        {/* Orders Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Pedidos</CardTitle>
            <CardDescription>Comparativa de pedidos mensuales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
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
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGuard>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DollarSign, ShoppingBag, Phone, Calendar, ArrowRight, Package, Receipt, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { Order } from "@/types/order";
import type { Expense } from "@/types/expense";

const ORDERS_STORAGE_KEY = "holy-moly-orders";
const EXPENSES_STORAGE_KEY = "holy-moly-expenses";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Date filters
  const [ordersStartDate, setOrdersStartDate] = useState("");
  const [ordersEndDate, setOrdersEndDate] = useState("");
  const [salesStartDate, setSalesStartDate] = useState("");
  const [salesEndDate, setSalesEndDate] = useState("");
  const [expensesStartDate, setExpensesStartDate] = useState("");
  const [expensesEndDate, setExpensesEndDate] = useState("");

  useEffect(() => {
    const loadOrders = () => {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        const parsedOrders = JSON.parse(stored);
        // Migrate old orders to new schema
        const migratedOrders = parsedOrders.map((order: any) => ({
          ...order,
          costAmount: order.costAmount ?? 0,
          chargeAmount: order.chargeAmount ?? order.totalAmount ?? 0,
          paymentMethod: order.paymentMethod ?? "cash",
          downPayment: order.downPayment ?? 0,
          selectedSupplies: order.selectedSupplies ?? [],
          suppliesNeeded: order.suppliesNeeded ?? "",
          statuses: order.statuses ?? (order.status ? [order.status] : ["waiting-for-payment"]),
        }));
        setOrders(migratedOrders);
      } else {
        setOrders([]);
      }
    };

    const loadExpenses = () => {
      const stored = localStorage.getItem(EXPENSES_STORAGE_KEY);
      if (stored) {
        setExpenses(JSON.parse(stored));
      } else {
        setExpenses([]);
      }
    };

    // Load data on mount
    loadOrders();
    loadExpenses();

    // Listen for visibility changes (when user switches tabs/routes)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadOrders();
        loadExpenses();
      }
    };

    // Listen for focus (when window gets focus)
    const handleFocus = () => {
      loadOrders();
      loadExpenses();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Filter orders by user role - cake topper providers only see orders with cake toppers
  const roleFilteredOrders = user?.role === "cake_topper_provider"
    ? orders.filter(order => order.needsCakeTopper)
    : orders;

  // Filter orders by date range
  const filteredOrders = roleFilteredOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    if (ordersStartDate && new Date(ordersStartDate) > orderDate) return false;
    if (ordersEndDate && new Date(ordersEndDate) < orderDate) return false;
    return true;
  });

  // Filter sales by date range
  const filteredSalesOrders = roleFilteredOrders.filter(order => {
    const orderDate = new Date(order.createdAt);
    if (salesStartDate && new Date(salesStartDate) > orderDate) return false;
    if (salesEndDate && new Date(salesEndDate) < orderDate) return false;
    return true;
  });

  // Filter expenses by date range
  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.purchaseDate);
    if (expensesStartDate && new Date(expensesStartDate) > expenseDate) return false;
    if (expensesEndDate && new Date(expensesEndDate) < expenseDate) return false;
    return true;
  });

  // Calculate totals
  const totalSales = filteredSalesOrders.reduce((sum, order) => sum + order.chargeAmount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingOrders = roleFilteredOrders
    .filter(order => new Date(order.deliveryDate) >= today)
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
    .slice(0, 10);

  const getTimeUntilDelivery = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate);
    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;
    return `In ${Math.ceil(diffDays / 7)} weeks`;
  };

  const handleWhatsApp = (phoneNumber: string, clientName: string) => {
    const message = encodeURIComponent(`Hello ${clientName}, regarding your order...`);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">
          {user?.role === "cake_topper_provider" 
            ? "Your cake topper orders overview" 
            : "Welcome back! Here's what's happening"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {user?.role === "owner" && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-3">{filteredOrders.length}</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Filter className="h-3 w-3" />
                      Filter Dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={ordersStartDate}
                        onChange={(e) => setOrdersStartDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={ordersEndDate}
                        onChange={(e) => setOrdersEndDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="To"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          setOrdersStartDate("");
                          setOrdersEndDate("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-3">₡{totalSales.toLocaleString()}</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Filter className="h-3 w-3" />
                      Filter Dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={salesStartDate}
                        onChange={(e) => setSalesStartDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={salesEndDate}
                        onChange={(e) => setSalesEndDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="To"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          setSalesStartDate("");
                          setSalesEndDate("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-3">₡{totalExpenses.toLocaleString()}</div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Filter className="h-3 w-3" />
                      Filter Dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-2">
                      <Input
                        type="date"
                        value={expensesStartDate}
                        onChange={(e) => setExpensesStartDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="From"
                      />
                      <Input
                        type="date"
                        value={expensesEndDate}
                        onChange={(e) => setExpensesEndDate(e.target.value)}
                        className="h-8 text-xs"
                        placeholder="To"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          setExpensesStartDate("");
                          setExpensesEndDate("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardContent>
            </Card>
          </>
        )}

        {user?.role === "cake_topper_provider" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Topper Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-3">{filteredOrders.length}</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Filter className="h-3 w-3" />
                    Filter Dates
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <div className="space-y-2">
                    <Input
                      type="date"
                      value={ordersStartDate}
                      onChange={(e) => setOrdersStartDate(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={ordersEndDate}
                      onChange={(e) => setOrdersEndDate(e.target.value)}
                      className="h-8 text-xs"
                      placeholder="To"
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        setOrdersStartDate("");
                        setOrdersEndDate("");
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Upcoming Orders</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {upcomingOrders.length} {upcomingOrders.length === 1 ? 'order' : 'orders'} scheduled for delivery
              </p>
            </div>
            <Button variant="ghost" onClick={() => navigate("/orders")} className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No upcoming orders</p>
              <p className="text-sm mt-1">New orders will appear here</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Delivery</TableHead>
                    <TableHead className="font-semibold">Time Until</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Method</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingOrders.map((order) => {
                    const timeUntil = getTimeUntilDelivery(order.deliveryDate);
                    const isUrgent = timeUntil === "Today" || timeUntil === "Tomorrow";
                    const remainingBalance = order.chargeAmount - order.downPayment;
                    
                    const getStatusColor = (status: string) => {
                      const colors = {
                        "waiting-for-payment": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
                        "partially-paid": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                        "payment-received": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
                        "confirmed": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                        "finished": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
                      };
                      return colors[status as keyof typeof colors] || "";
                    };

                    const getStatusLabel = (status: string) => {
                      const labels = {
                        "waiting-for-payment": "Waiting",
                        "partially-paid": "Partial",
                        "payment-received": "Paid",
                        "confirmed": "Confirmed",
                        "finished": "Finished",
                      };
                      return labels[status as keyof typeof labels] || status;
                    };
                    
                    return (
                      <TableRow 
                        key={order.id} 
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate("/orders")}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {order.clientPhotos.length > 0 ? (
                              <img 
                                src={order.clientPhotos[0]} 
                                alt={order.clientName}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-background"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-sm font-medium text-muted-foreground">
                                  {order.clientName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{order.clientName}</div>
                              <div className="text-xs text-muted-foreground">{order.phoneNumber}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{new Date(order.deliveryDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric'
                            })}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={isUrgent ? "destructive" : "secondary"}
                            className="font-medium"
                          >
                            {timeUntil}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-semibold">₡{order.chargeAmount.toLocaleString()}</div>
                            {order.downPayment > 0 && remainingBalance > 0 && (
                              <div className="text-xs text-muted-foreground">
                                Balance: ₡{remainingBalance.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs capitalize">
                            {order.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {order.statuses.slice(0, 2).map(status => (
                              <Badge key={status} className={`text-xs ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                              </Badge>
                            ))}
                            {order.statuses.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{order.statuses.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsApp(order.phoneNumber, order.clientName);
                            }}
                            className="gap-2"
                          >
                            <Phone className="h-3 w-3" />
                            Contact
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

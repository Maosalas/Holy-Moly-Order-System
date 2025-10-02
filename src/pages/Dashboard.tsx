import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { DollarSign, ShoppingBag, Phone, Image as ImageIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";

const ORDERS_STORAGE_KEY = "holy-moly-orders";

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const loadOrders = () => {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        setOrders(JSON.parse(stored));
      } else {
        setOrders([]);
      }
    };

    // Load orders on mount
    loadOrders();

    // Listen for visibility changes (when user switches tabs/routes)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadOrders();
      }
    };

    // Listen for focus (when window gets focus)
    const handleFocus = () => {
      loadOrders();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  // Calculate total sales (assuming $50 per order for now since we don't have pricing)
  const totalSales = monthOrders.length * 50;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcomingOrders = orders
    .filter(order => new Date(order.deliveryDate) >= today)
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  
  // Get orders for a specific date
  const getOrdersForDate = (date: Date) => {
    return orders.filter(order => {
      const orderDate = new Date(order.deliveryDate);
      return (
        orderDate.getDate() === date.getDate() &&
        orderDate.getMonth() === date.getMonth() &&
        orderDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Get dates that have orders
  const datesWithOrders = orders.map(order => {
    const date = new Date(order.deliveryDate);
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const selectedDateOrders = selectedDate ? getOrdersForDate(selectedDate) : [];

  const handleWhatsApp = (phoneNumber: string, clientName: string) => {
    const message = encodeURIComponent(`Hello ${clientName}, regarding your order...`);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders This Month</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Total orders in {new Date().toLocaleDateString('en-US', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue for this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold">Upcoming Orders Calendar</h3>
          <Button variant="ghost" onClick={() => navigate("/orders")} className="gap-2">
            View All <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {upcomingOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No upcoming orders
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select a Date</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className={cn("rounded-md border pointer-events-auto")}
                  modifiers={{
                    hasOrder: datesWithOrders,
                  }}
                  modifiersStyles={{
                    hasOrder: {
                      fontWeight: 'bold',
                      textDecoration: 'underline',
                    },
                  }}
                  disabled={(date) => {
                    const checkDate = new Date(date);
                    checkDate.setHours(0, 0, 0, 0);
                    return checkDate < today;
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate 
                    ? `Orders for ${selectedDate.toLocaleDateString()}` 
                    : 'Select a date to view orders'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDate && selectedDateOrders.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateOrders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{order.clientName}</h4>
                            <p className="text-sm text-muted-foreground">{order.phoneNumber}</p>
                          </div>
                          {order.needsCakeTopper && (
                            <Badge variant="secondary" className="text-xs">Topper</Badge>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2">{order.orderDetails}</p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleWhatsApp(order.phoneNumber, order.clientName)}
                            className="gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/orders")}
                          >
                            View Details
                          </Button>
                        </div>
                        {order.clientPhotos.length > 0 && (
                          <div className="flex gap-2">
                            {order.clientPhotos.slice(0, 3).map((photo, index) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Client idea ${index + 1}`}
                                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(photo, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedDate ? (
                  <p className="text-center text-muted-foreground py-8">
                    No orders for this date
                  </p>
                ) : (
                  <div className="space-y-2 py-4">
                    <p className="text-sm text-muted-foreground">
                      You have {upcomingOrders.length} upcoming {upcomingOrders.length === 1 ? 'order' : 'orders'}
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {upcomingOrders.slice(0, 5).map((order) => (
                        <div 
                          key={order.id} 
                          className="text-sm p-2 rounded hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => setSelectedDate(new Date(order.deliveryDate))}
                        >
                          <div className="font-medium">{order.clientName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(order.deliveryDate).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ShoppingBag, Calendar, Phone, Image as ImageIcon, ArrowRight } from "lucide-react";
import type { Order } from "@/types/order";

const ORDERS_STORAGE_KEY = "holy-moly-orders";

const Dashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (stored) {
      setOrders(JSON.parse(stored));
    }
  }, []);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  // Calculate total sales (assuming $50 per order for now since we don't have pricing)
  const totalSales = monthOrders.length * 50;

  const upcomingOrders = orders
    .filter(order => new Date(order.deliveryDate) >= new Date())
    .sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime())
    .slice(0, 5);

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
          <h3 className="text-2xl font-semibold">Upcoming Orders</h3>
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
          <div className="grid gap-4">
            {upcomingOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{order.clientName}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleWhatsApp(order.phoneNumber, order.clientName)}
                          className="gap-2"
                        >
                          <Phone className="h-4 w-4" />
                          WhatsApp
                        </Button>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(order.deliveryDate).toLocaleDateString()}
                        </div>
                        {order.needsCakeTopper && (
                          <Badge variant="secondary">Cake Topper</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Order Details</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {order.orderDetails}
                    </p>
                  </div>
                  {order.clientPhotos.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        Client Ideas ({order.clientPhotos.length})
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        {order.clientPhotos.slice(0, 4).map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Client idea ${index + 1}`}
                            className="w-full h-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

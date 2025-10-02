import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/types/order";

interface OrderFormProps {
  onSubmit: (order: Omit<Order, "id" | "createdAt">) => void;
  initialData?: Order;
  onCancel?: () => void;
}

export const OrderForm = ({ onSubmit, initialData, onCancel }: OrderFormProps) => {
  const { toast } = useToast();
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [orderDetails, setOrderDetails] = useState(initialData?.orderDetails || "");
  const [deliveryDate, setDeliveryDate] = useState(initialData?.deliveryDate || "");
  const [needsCakeTopper, setNeedsCakeTopper] = useState(initialData?.needsCakeTopper || false);
  const [clientPhotos, setClientPhotos] = useState<string[]>(initialData?.clientPhotos || []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => URL.createObjectURL(file));
      setClientPhotos(prev => [...prev, ...newPhotos]);
      toast({
        title: "Photos uploaded",
        description: `${files.length} photo(s) added successfully`,
      });
    }
  };

  const removePhoto = (index: number) => {
    setClientPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim() || !phoneNumber.trim() || !orderDetails.trim() || !deliveryDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      clientName: clientName.trim(),
      phoneNumber: phoneNumber.trim(),
      orderDetails: orderDetails.trim(),
      deliveryDate,
      clientPhotos,
      needsCakeTopper,
    });

    setClientName("");
    setPhoneNumber("");
    setOrderDetails("");
    setDeliveryDate("");
    setClientPhotos([]);
    setNeedsCakeTopper(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Order" : "New Order"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name *</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Enter client name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g., +1234567890"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orderDetails">Order Details *</Label>
            <Textarea
              id="orderDetails"
              value={orderDetails}
              onChange={(e) => setOrderDetails(e.target.value)}
              placeholder="Describe the order details..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryDate">Delivery Date *</Label>
            <Input
              id="deliveryDate"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Client Ideas / Photos</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="relative" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photos
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </Button>
            </div>
            {clientPhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {clientPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photo}
                      alt={`Client idea ${index + 1}`}
                      className="w-full h-24 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="cakeTopper"
              checked={needsCakeTopper}
              onCheckedChange={setNeedsCakeTopper}
            />
            <Label htmlFor="cakeTopper" className="cursor-pointer">
              Needs Cake Topper
            </Label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {initialData ? "Update Order" : "Create Order"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

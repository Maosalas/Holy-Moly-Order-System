import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TopperUploadDialog } from "./TopperUploadDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Order, OrderStatus, PaymentMethod, OrderSupply } from "@/types/order";
import type { Supply } from "@/types/supply";

const SUPPLIES_STORAGE_KEY = "holy-moly-supplies";

interface OrderFormProps {
  onSubmit: (order: Omit<Order, "id" | "createdAt">) => void;
  initialData?: Order;
  onCancel?: () => void;
}

export const OrderForm = ({ onSubmit, initialData, onCancel }: OrderFormProps) => {
  const { toast } = useToast();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [orderDetails, setOrderDetails] = useState(initialData?.orderDetails || "");
  const [deliveryDate, setDeliveryDate] = useState(initialData?.deliveryDate || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || "cash");
  const [clientPhotos, setClientPhotos] = useState<string[]>(initialData?.clientPhotos || []);
  const [selectedSupplies, setSelectedSupplies] = useState<OrderSupply[]>(initialData?.selectedSupplies || []);
  const [chargeAmount, setChargeAmount] = useState(initialData?.chargeAmount?.toString() || "");
  const [downPayment, setDownPayment] = useState(initialData?.downPayment?.toString() || "0");
  const [suppliesNeeded, setSuppliesNeeded] = useState(initialData?.suppliesNeeded || "");
  const [needsCakeTopper, setNeedsCakeTopper] = useState(initialData?.needsCakeTopper || false);
  const [statuses, setStatuses] = useState<OrderStatus[]>(initialData?.statuses || ["waiting-for-payment"]);

  // Load supplies from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(SUPPLIES_STORAGE_KEY);
    if (stored) {
      setSupplies(JSON.parse(stored));
    }
  }, []);

  // Calculate cost from selected supplies
  const costAmount = selectedSupplies.reduce((sum, item) => sum + item.totalCost, 0);
  const profit = (parseFloat(chargeAmount) || 0) - costAmount;

  const availableStatuses: { value: OrderStatus; label: string }[] = [
    { value: "waiting-for-payment", label: "Waiting for Payment" },
    { value: "partially-paid", label: "Partially Paid" },
    { value: "payment-received", label: "Payment Received" },
    { value: "confirmed", label: "Confirmed" },
    { value: "finished", label: "Finished" },
  ];

  const toggleStatus = (status: OrderStatus) => {
    setStatuses(prev => 
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const addSupply = (supplyId: string) => {
    const supply = supplies.find(s => s.id === supplyId);
    if (!supply) return;

    const alreadyAdded = selectedSupplies.find(s => s.supplyId === supplyId);
    if (alreadyAdded) {
      toast({
        title: "Supply already added",
        description: `${supply.name} is already in the list`,
        variant: "destructive",
      });
      return;
    }

    const newSupply: OrderSupply = {
      supplyId: supply.id,
      supplyName: supply.name,
      quantity: 1,
      unit: supply.unit,
      costPerUnit: supply.cost,
      totalCost: supply.cost,
    };

    setSelectedSupplies([...selectedSupplies, newSupply]);
  };

  const updateSupplyQuantity = (supplyId: string, quantity: number) => {
    setSelectedSupplies(prev =>
      prev.map(s =>
        s.supplyId === supplyId
          ? { ...s, quantity, totalCost: s.costPerUnit * quantity }
          : s
      )
    );
  };

  const removeSupply = (supplyId: string) => {
    setSelectedSupplies(prev => prev.filter(s => s.supplyId !== supplyId));
  };

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
    
    if (!clientName.trim() || !phoneNumber.trim() || !orderDetails.trim() || !deliveryDate || !chargeAmount) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const charge = parseFloat(chargeAmount);
    const downPmt = parseFloat(downPayment) || 0;

    if (isNaN(charge) || charge <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid charge amount",
        variant: "destructive",
      });
      return;
    }

    if (downPmt > charge) {
      toast({
        title: "Invalid down payment",
        description: "Down payment cannot exceed charge amount",
        variant: "destructive",
      });
      return;
    }

    onSubmit({
      clientName: clientName.trim(),
      phoneNumber: phoneNumber.trim(),
      orderDetails: orderDetails.trim(),
      deliveryDate,
      paymentMethod,
      clientPhotos,
      costAmount,
      chargeAmount: charge,
      downPayment: downPmt,
      selectedSupplies,
      suppliesNeeded: suppliesNeeded.trim(),
      needsCakeTopper,
      statuses: statuses.length > 0 ? statuses : ["waiting-for-payment"],
    });

    setClientName("");
    setPhoneNumber("");
    setOrderDetails("");
    setDeliveryDate("");
    setPaymentMethod("cash");
    setClientPhotos([]);
    setSelectedSupplies([]);
    setChargeAmount("");
    setDownPayment("0");
    setSuppliesNeeded("");
    setNeedsCakeTopper(false);
    setStatuses(["waiting-for-payment"]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Order" : "New Order"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Client Information</h3>
            
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
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          {/* Section 2: Financial & Supplies */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold border-b pb-2">Financial & Supplies</h3>
            
            {/* Supplies Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Supplies from Inventory</Label>
                <Select onValueChange={addSupply}>
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Add supply..." />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((supply) => (
                      <SelectItem key={supply.id} value={supply.id}>
                        {supply.name} - ₡{supply.cost.toLocaleString()}/{supply.unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSupplies.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Supply</TableHead>
                        <TableHead className="w-[120px]">Quantity</TableHead>
                        <TableHead className="w-[100px]">Unit</TableHead>
                        <TableHead className="w-[120px]">Cost/Unit</TableHead>
                        <TableHead className="w-[120px]">Total</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSupplies.map((supply) => (
                        <TableRow key={supply.supplyId}>
                          <TableCell className="font-medium">{supply.supplyName}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={supply.quantity}
                              onChange={(e) => updateSupplyQuantity(supply.supplyId, parseFloat(e.target.value) || 0)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">{supply.unit}</TableCell>
                          <TableCell>₡{supply.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell className="font-semibold">₡{supply.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSupply(supply.supplyId)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost to Make (₡)</Label>
                <div className="p-3 rounded-md bg-muted border">
                  <p className="text-lg font-semibold">
                    ₡{costAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Calculated from supplies</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chargeAmount">Amount to Charge (₡) *</Label>
                <Input
                  id="chargeAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Profit (₡)</Label>
              <div className={`p-3 rounded-md ${profit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  ₡{profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPayment">Down Payment (₡)</Label>
              <Input
                id="downPayment"
                type="number"
                step="0.01"
                min="0"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suppliesNeeded">Additional Notes</Label>
              <Textarea
                id="suppliesNeeded"
                value={suppliesNeeded}
                onChange={(e) => setSuppliesNeeded(e.target.value)}
                placeholder="Any additional supplies or notes..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Order Status (Select all that apply)</Label>
              <div className="space-y-2">
                {availableStatuses.map(({ value, label }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={value}
                      checked={statuses.includes(value)}
                      onCheckedChange={() => toggleStatus(value)}
                    />
                    <Label htmlFor={value} className="cursor-pointer font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Cake Topper */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-semibold border-b pb-2">Cake Topper</h3>
            
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

            {needsCakeTopper && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Cake Topper Details</Label>
                  <TopperUploadDialog clientName={clientName || "Client"} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Click the button above to add topper reference photos and details
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
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

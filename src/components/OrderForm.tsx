import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Plus, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TopperUploadDialog } from "./TopperUploadDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Order, OrderStatus, PaymentMethod, OrderSupply } from "@/types/order";
import type { Supply } from "@/types/supply";
import { suppliesApi } from "@/lib/api";

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

  // Load supplies from API
  useEffect(() => {
    const fetchSupplies = async () => {
      const result = await suppliesApi.getAll();
      if (result.data) {
        const suppliesData = Array.isArray(result.data) ? result.data : [];
        setSupplies(suppliesData.map((s: any) => ({
          ...s,
          createdAt: s.created_at
        })));
      }
    };
    fetchSupplies();
  }, []);

  // Calculate cost from selected supplies
  const costAmount = selectedSupplies.reduce((sum, item) => sum + item.totalCost, 0);
  const profit = (parseFloat(chargeAmount) || 0) - costAmount;

  const availableStatuses: { value: OrderStatus; label: string }[] = [
    { value: "waiting-for-payment", label: "Espera de pago" },
    { value: "partially-paid", label: "Pago Parcial" },
    { value: "payment-received", label: "Pago recibido" },
    { value: "confirmed", label: "Confirmado" },
    { value: "finished", label: "Terminado" },
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
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="transfer">Trasnferencia</SelectItem>
                  <SelectItem value="card">Link de pago/tarjeta</SelectItem>
                  <SelectItem value="other">SINPE</SelectItem>
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
          <div className="space-y-5 pt-4">
            <h3 className="text-lg font-semibold border-b pb-2">Financial & Supplies</h3>
            
            {/* Supplies Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Supplies from Inventory</Label>
                  <p className="text-sm text-muted-foreground mt-1">Select multiple supplies to calculate costs</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select onValueChange={addSupply}>
                  <SelectTrigger className="flex-1 h-11 bg-background border-2 hover:border-primary/50 transition-colors">
                    <SelectValue placeholder="Choose a supply to add..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {supplies.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No supplies available. Add supplies in the Supplies page first.
                      </div>
                    ) : (
                      supplies.map((supply) => (
                        <SelectItem 
                          key={supply.id} 
                          value={supply.id}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-4">
                            <span className="font-medium">{supply.name}</span>
                            <span className="text-muted-foreground text-sm">
                              ₡{supply.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })} / {supply.unit}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => {
                    const select = document.querySelector('[role="combobox"]') as HTMLElement;
                    select?.click();
                  }}
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {selectedSupplies.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                    <div className="rounded-full bg-muted p-3">
                      <Package className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-medium">No supplies added yet</p>
                      <p className="text-sm mt-1">Select supplies from the dropdown above</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {selectedSupplies.length} {selectedSupplies.length === 1 ? 'supply' : 'supplies'} selected
                    </span>
                  </div>
                  
                  <div className="border-2 rounded-lg overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="font-semibold">Supply Name</TableHead>
                          <TableHead className="w-[130px] font-semibold">Quantity</TableHead>
                          <TableHead className="w-[80px] font-semibold">Unit</TableHead>
                          <TableHead className="w-[120px] font-semibold text-right">Cost/Unit</TableHead>
                          <TableHead className="w-[120px] font-semibold text-right">Subtotal</TableHead>
                          <TableHead className="w-[60px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSupplies.map((supply, index) => (
                          <TableRow key={supply.supplyId} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                  {index + 1}
                                </div>
                                {supply.supplyName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={supply.quantity}
                                onChange={(e) => updateSupplyQuantity(supply.supplyId, parseFloat(e.target.value) || 0)}
                                className="h-9 text-center"
                              />
                            </TableCell>
                            <TableCell className="text-muted-foreground font-medium">{supply.unit}</TableCell>
                            <TableCell className="text-right font-medium">
                              ₡{supply.costPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              ₡{supply.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSupply(supply.supplyId)}
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                title="Remove supply"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/30 hover:bg-muted/30 font-semibold">
                          <TableCell colSpan={4} className="text-right">Total Cost:</TableCell>
                          <TableCell className="text-right text-lg font-bold text-primary">
                            ₡{costAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
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

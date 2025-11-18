import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Plus, Trash2, Package, Check, ChevronsUpDown, Wallet, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TopperUploadDialog } from "./TopperUploadDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { Order, OrderStatus, PaymentMethod } from "@/types/order";
import type { Quotation } from "@/types/quotation";
import { quotationsApi, paymentMethodsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/contexts/OrganizationContext";

interface OrderFormProps {
  onSubmit: (order: Omit<Order, "id" | "createdAt">) => void;
  initialData?: Order;
  onCancel?: () => void;
  quotation?: Quotation;
}

export const OrderForm = ({ onSubmit, initialData, onCancel, quotation }: OrderFormProps) => {
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>(initialData?.quotationId || "");
  const [clientName, setClientName] = useState(initialData?.clientName || "");
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [orderDetails, setOrderDetails] = useState(initialData?.orderDetails || "");
  const [deliveryDate, setDeliveryDate] = useState<string>(
    initialData?.deliveryDate
      ? new Date(initialData.deliveryDate).toISOString().slice(0, 16)
      : ""
  );
  const [paymentMethodId, setPaymentMethodId] = useState<string>(
    initialData?.paymentMethod
      ? (typeof initialData.paymentMethod === 'string' ? "" : initialData.paymentMethod.id)
      : ""
  );
  const [clientPhotos, setClientPhotos] = useState<string[]>(
    initialData?.clientPhotos?.map(photo =>
      typeof photo === 'string' ? photo : photo.photoUrl
    ) || []
  );
  const [chargeAmount, setChargeAmount] = useState(initialData?.chargeAmount?.toString() || "");
  const [downPayment, setDownPayment] = useState(initialData?.downPayment?.toString() || "0");
  const [suppliesNeeded, setSuppliesNeeded] = useState(initialData?.suppliesNeeded || "");
  const [needsCakeTopper, setNeedsCakeTopper] = useState(initialData?.needsCakeTopper || false);
  const [topperDetails, setTopperDetails] = useState(initialData?.topperDetails || "");
  const [topperPhotos, setTopperPhotos] = useState<string[]>(initialData?.topperPhotos || []);
  const [statuses, setStatuses] = useState<OrderStatus[]>(
    initialData?.statuses
      ? initialData.statuses.map(s => typeof s === 'string' ? s : s.status)
      : ["waiting_for_payment"]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load quotations and payment methods from API
  useEffect(() => {
    const fetchQuotations = async () => {
      const result = await quotationsApi.getAll();
      if (result.data) {
        const quotationsData = Array.isArray(result.data) ? result.data : [];
        setQuotations(quotationsData);
      }
    };

    const fetchPaymentMethods = async () => {
      const result = await paymentMethodsApi.getAll();
      if (result.data) {
        const paymentMethodsData = Array.isArray(result.data) ? result.data : [];
        setPaymentMethods(paymentMethodsData);

        // Set default payment method if not editing and methods are available
        if (!initialData && paymentMethodsData.length > 0) {
          setPaymentMethodId(paymentMethodsData[0].id);
        }
      }
    };

    fetchQuotations();
    fetchPaymentMethods();
  }, [initialData]);

  // Pre-poblar datos cuando se pasa una cotización
  useEffect(() => {
    if (quotation && !initialData) {
      setSelectedQuotationId(quotation.id);
      setClientName(quotation.clientName || "");
      setChargeAmount(quotation.totalCost.toString());
      // Puedes pre-poblar otros campos si es necesario
    }
  }, [quotation, initialData]);

  // Calculate cost from selected quotation
  const selectedQuotation = quotations.find(q => q.id === selectedQuotationId);
  const costAmount = selectedQuotation ? selectedQuotation.totalCost : (initialData?.costAmount || 0);
  const profit = (parseFloat(chargeAmount) || 0) - costAmount;

  // Update form fields when initialData changes
  useEffect(() => {
    if (initialData) {
      setSelectedQuotationId(initialData.quotationId || "");
      setClientName(initialData.clientName || "");
      setPhoneNumber(initialData.phoneNumber || "");
      setOrderDetails(initialData.orderDetails || "");
      const formattedDate = initialData.deliveryDate
        ? new Date(initialData.deliveryDate).toISOString().slice(0, 16)
        : "";
      setDeliveryDate(formattedDate);
      setPaymentMethodId(
        initialData.paymentMethod
          ? (typeof initialData.paymentMethod === 'string' ? "" : initialData.paymentMethod.id)
          : ""
      );
      // Extract photoUrl from clientPhotos objects
      const photos = initialData.clientPhotos?.map(photo =>
        typeof photo === 'string' ? photo : photo.photoUrl
      ) || [];
      setClientPhotos(photos);
      setChargeAmount(initialData.chargeAmount?.toString() || "");
      setDownPayment(initialData.downPayment?.toString() || "0");
      setSuppliesNeeded(initialData.suppliesNeeded || "");
      setNeedsCakeTopper(initialData.needsCakeTopper || false);
      setTopperDetails(initialData.topperDetails || "");
      setTopperPhotos(initialData.topperPhotos || []);
      setStatuses(
        initialData.statuses
          ? initialData.statuses.map(s => typeof s === 'string' ? s : s.status)
          : ["waiting_for_payment"]
      );
    } else {
      // Reset form when creating new order
      setSelectedQuotationId("");
      setClientName("");
      setPhoneNumber("");
      setOrderDetails("");
      setDeliveryDate("");
      setPaymentMethodId("");
      setClientPhotos([]);
      setChargeAmount("");
      setDownPayment("0");
      setSuppliesNeeded("");
      setNeedsCakeTopper(false);
      setTopperDetails("");
      setTopperPhotos([]);
      setStatuses(["waiting_for_payment"]);
    }
  }, [initialData]);

  const availableStatuses: { value: OrderStatus; label: string }[] = [
    { value: "waiting_for_payment", label: "Espera de pago" },
    { value: "partially_paid", label: "Pago Parcial" },
    { value: "payment_received", label: "Pago recibido" },
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
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Siempre forzar que empiece con +506
    if (!value.startsWith("+506")) {
      value = "+506 " + value.replace(/^(\+?506)?\s?/, "");
    }

    setPhoneNumber(value);
  };
  const compressImage = (base64: string, callback: (compressed: string) => void) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Max dimensions
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;

      let width = img.width;
      let height = img.height;

      // Calculate new dimensions maintaining aspect ratio
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      // Compress to JPEG with 0.7 quality (70%)
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressed);
    };
    img.src = base64;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({
            title: "Archivo muy grande",
            description: "Por favor selecciona una imagen menor a 5MB",
            variant: "destructive",
          });
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          compressImage(reader.result as string, (compressed) => {
            setClientPhotos(prev => [...prev, compressed]);
          });
        };
        reader.readAsDataURL(file);
      });

      toast({
        title: "Fotos cargadas",
        description: `${files.length} foto(s) agregada(s) exitosamente`,
      });
    }
  };

  const removePhoto = (index: number) => {
    setClientPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    const isUpdate = !!initialData;

    if (!clientName.trim() || !phoneNumber.trim() || !orderDetails.trim() || !deliveryDate || !chargeAmount || !selectedQuotationId || !paymentMethodId) {
      toast({
        title: "Información incompleta",
        description: "Por favor complete todos los campos obligatorios marcados con * (incluyendo la cotización y método de pago)",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const charge = parseFloat(chargeAmount);
    const downPmt = parseFloat(downPayment) || 0;

    if (isNaN(charge) || charge <= 0) {
      toast({
        title: "Monto a cobrar inválido",
        description: "Por favor ingrese un monto válido mayor a 0",
        variant: "destructive",
      });
      return;
    }

    if (downPmt > charge) {
      toast({
        title: "Monto de depósito inválido",
        description: "Monto de deposito no puede ser mayor al monto a cobrar",
        variant: "destructive",
      });
      return;
    }

    // Get the selected payment method object
    const selectedPaymentMethod = paymentMethods.find(pm => pm.id === paymentMethodId);
    if (!selectedPaymentMethod) {
      toast({
        title: "Método de pago requerido",
        description: "Por favor seleccione un método de pago",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const orderData: Omit<Order, "id" | "createdAt"> = {
      organizationId: currentOrganization?.id || "",
      quotationId: selectedQuotationId,
      clientName: clientName.trim(),
      phoneNumber: phoneNumber.trim(),
      orderDetails: orderDetails.trim(),
      deliveryDate: new Date(deliveryDate),
      paymentMethod: selectedPaymentMethod, // Include the full object for type compatibility
      clientPhotos,
      costAmount,
      chargeAmount: charge,
      downPayment: downPmt,
      suppliesNeeded: suppliesNeeded.trim(),
      needsCakeTopper,
      topperDetails: needsCakeTopper ? topperDetails.trim() : undefined,
      topperPhotos: needsCakeTopper ? topperPhotos : undefined,
      statuses: (statuses.length > 0 ? statuses : ["waiting-for-payment"]) as OrderStatus[],
    };

    try {
      await onSubmit(orderData);

      // Generate and download calendar event
      const { downloadICS } = await import("@/lib/utils");
      const fullOrder: Order = {
        ...orderData,
        id: initialData?.id || crypto.randomUUID(),
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };
      downloadICS(fullOrder, isUpdate ? 'update' : 'create');

      setSelectedQuotationId("");
      setClientName("");
      setPhoneNumber("");
      setOrderDetails("");
      setDeliveryDate("");
      setPaymentMethodId(paymentMethods.length > 0 ? paymentMethods[0].id : "");
      setClientPhotos([]);
      setChargeAmount("");
      setDownPayment("0");
      setSuppliesNeeded("");
      setNeedsCakeTopper(false);
      setTopperDetails("");
      setTopperPhotos([]);
      setStatuses(["waiting_for_payment"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Actulizar pedido" : "Nuevo pedido"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Client Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Información del cliente</h3>

            <div className="space-y-2">
              <Label htmlFor="clientName">Nombre del cliente *</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número de teléfono *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={handleChange}
                placeholder="+506 1234 5678"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderDetails">Detalles del pedido *</Label>
              <Textarea
                id="orderDetails"
                value={orderDetails}
                onChange={(e) => setOrderDetails(e.target.value)}
                placeholder="Describe el pedido del cliente..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Fecha de entrega *</Label>
              <Input
                id="deliveryDate"
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de pago *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={paymentMethods.length === 0}
                  >
                    <span className="flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      {paymentMethods.find((pm) => pm.id === paymentMethodId)?.name || "Seleccionar método de pago"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar método de pago..." />
                    <CommandList>
                      <CommandEmpty>No se encontró método de pago.</CommandEmpty>
                      <CommandGroup>
                        {paymentMethods.map((method) => (
                           <CommandItem
                            key={method.id}
                            value={method.name}
                            onSelect={() => setPaymentMethodId(method.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                paymentMethodId === method.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {method.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Fotos de referencia</Label>
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

          {/* Section 2: Financial & Quotation */}
          <div className="space-y-5 pt-4">
            <h3 className="text-lg font-semibold border-b pb-2">Miscelaneos y Financias</h3>

            {/* Quotation Selection */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Cotización *</Label>
                <p className="text-sm text-muted-foreground mt-1">Seleccione una cotización para este pedido</p>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full h-11 bg-background border-2 hover:border-primary/50 transition-colors justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {selectedQuotation
                        ? `${selectedQuotation.clientName} - ${selectedQuotation.size} (₡${selectedQuotation.totalCost.toFixed(2)})`
                        : "Seleccionar cotización..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cotización..." />
                    <CommandList>
                      <CommandEmpty>
                        {quotations.length === 0
                          ? "No hay cotizaciones disponibles. Agregue una cotización primero."
                          : "No se encontraron cotizaciones."}
                      </CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => setSelectedQuotationId("")}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !selectedQuotationId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">Ninguna</span>
                        </CommandItem>
                        {quotations.map((quotation) => (
                          <CommandItem
                            key={quotation.id}
                            value={quotation.id}
                            onSelect={() => setSelectedQuotationId(quotation.id)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedQuotationId === quotation.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-medium">{quotation.clientName}</span>
                              <div className="text-sm text-muted-foreground">
                                {quotation.size} - ₡{quotation.totalCost.toFixed(2)}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="costAmount">Costo total (₡)</Label>
                <Input
                  id="costAmount"
                  type="number"
                  value={costAmount.toFixed(2)}
                  disabled
                  className="font-semibold bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chargeAmount">Precio a cobrar (₡) *</Label>
                <Input
                  id="chargeAmount"
                  type="number"
                  step="any"
                  min="0.1"
                  value={chargeAmount}
                  onChange={(e) => setChargeAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Ganancia (₡)</Label>
              <div className={`p-3 rounded-md ${profit >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                <p className={`text-lg font-semibold ${profit >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  ₡{profit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPayment">Depósito (₡)</Label>
              <Input
                id="downPayment"
                type="number"
                step="any"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suppliesNeeded">Notas adicionales</Label>
              <Textarea
                id="suppliesNeeded"
                value={suppliesNeeded}
                onChange={(e) => setSuppliesNeeded(e.target.value)}
                placeholder="Any additional supplies or notes..."
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Status de orden (Select all that apply)</Label>
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
                Necesita Cake Topper
              </Label>
            </div>

            {needsCakeTopper && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Detalles del Topper</Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="topperDetails">Descripción</Label>
                    <Textarea
                      id="topperDetails"
                      value={topperDetails}
                      onChange={(e) => setTopperDetails(e.target.value)}
                      placeholder="Describa los detalles del topper aquí..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fotos de referencia del topper</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="relative" asChild>
                        <label className="cursor-pointer">
                          <Upload className="mr-2 h-4 w-4" />
                          Subir Fotos
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files) {
                                Array.from(files).forEach(file => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    compressImage(reader.result as string, (compressed) => {
                                      setTopperPhotos(prev => [...prev, compressed]);
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                });
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>
                      </Button>
                    </div>
                    
                    {topperPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {topperPhotos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Topper reference ${index + 1}`}
                              className="w-full h-24 object-cover rounded-md"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setTopperPhotos(prev => prev.filter((_, i) => i !== index))}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (initialData ? "Actualizar pedido" : "Crear Pedido")}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card >
  );
};

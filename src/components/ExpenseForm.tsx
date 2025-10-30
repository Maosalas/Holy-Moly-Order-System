import { useState, useEffect } from "react";
import { Expense, CardType } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, CreditCard, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { cardTypesApi } from "@/lib/api";

interface ExpenseFormProps {
  onSubmit: (expense: Expense) => void;
  initialData?: Expense;
  onCancel?: () => void;
}

const ExpenseForm = ({ onSubmit, initialData, onCancel }: ExpenseFormProps) => {
  const { toast } = useToast();
  const [supermarketName, setSupermarketName] = useState(initialData?.supermarketName || "");
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchaseDate || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [cardTypeId, setCardTypeId] = useState<string>(initialData?.cardType?.id || "");
  const [receiptUrl, setReceiptUrl] = useState<string[]>(initialData?.receiptUrl ? [initialData.receiptUrl] : []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [isLoadingCardTypes, setIsLoadingCardTypes] = useState(true);

  // Update form fields when initialData changes
  useEffect(() => {
    if (initialData) {
      setSupermarketName(initialData.supermarketName || "");
      // Format date to YYYY-MM-DD for date input
      const formattedDate = initialData.purchaseDate ? initialData.purchaseDate.split('T')[0] : "";
      setPurchaseDate(formattedDate);
      setAmount(initialData.amount?.toString() || "");
      setCardTypeId(initialData.cardType?.id || "");
      setReceiptUrl(initialData.receiptUrl ? [initialData.receiptUrl] : []);
    } else {
      // Reset form when creating new expense
      setSupermarketName("");
      setPurchaseDate("");
      setAmount("");
      setReceiptUrl([]);
      // cardTypeId will be set when card types are loaded
    }
  }, [initialData]);

  useEffect(() => {
    const fetchCardTypes = async () => {
      try {
        const result = await cardTypesApi.getAll();
        if (result.data) {
          const cardTypesData = Array.isArray(result.data) ? result.data : [];
          setCardTypes(cardTypesData);

          // Set default card type if not editing and card types are available
          if (!initialData && cardTypesData.length > 0) {
            setCardTypeId(cardTypesData[0].id);
          }
        }
      } catch (error) {
        toast({
          title: "Error loading card types",
          description: "Could not load card types. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCardTypes(false);
      }
    };

    fetchCardTypes();
  }, [initialData, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!supermarketName || !purchaseDate || !amount || !cardTypeId) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // For API submission, we send cardTypeId, but for type compatibility we need the full object
    const selectedCardType = cardTypes.find(ct => ct.id === cardTypeId);
    if (!selectedCardType) {
      toast({
        title: "Invalid card type",
        description: "Please select a valid card type",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const expensePayload: any = {
      id: initialData?.id || crypto.randomUUID(),
      supermarketName,
      purchaseDate,
      amount: parseFloat(amount),
      cardTypeId, // Send cardTypeId to the API
      receiptUrl: receiptUrl.length > 0 ? receiptUrl[0] : undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    try {
      await onSubmit(expensePayload);

      if (!initialData) {
        setSupermarketName("");
        setPurchaseDate("");
        setAmount("");
        setCardTypeId(cardTypes.length > 0 ? cardTypes[0].id : "");
        setReceiptUrl([]);
      }
    } finally {
      setIsSubmitting(false);
    }
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
  const removePhoto = (index: number) => {
    setReceiptUrl(prev => prev.filter((_, i) => i !== index));
  };
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 5MB limit
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
            setReceiptUrl(prev => [...prev, compressed]);
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


  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Expense" : "New Expense"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supermarket">Supermarket Name *</Label>
              <Input
                id="supermarket"
                value={supermarketName}
                onChange={(e) => setSupermarketName(e.target.value)}
                placeholder="e.g., AutoMercado"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Purchase Date *</Label>
              <Input
                id="date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₡) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card">Card Type *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={isLoadingCardTypes}
                  >
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {isLoadingCardTypes
                        ? "Loading..."
                        : cardTypes.find((ct) => ct.id === cardTypeId)?.description || "Select card type"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search card type..." />
                    <CommandList>
                      <CommandEmpty>No card type found.</CommandEmpty>
                      <CommandGroup>
                        {cardTypes.map((card) => (
                          <CommandItem
                            key={card.id}
                            value={card.name}
                            onSelect={() => setCardTypeId(card.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                cardTypeId === card.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {card.description}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subir Factura</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              id="receipt-upload"
              onChange={handlePhotoUpload}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("receipt-upload")?.click()}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              Subir factura
            </Button>
          </div>
          {receiptUrl.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {receiptUrl.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Receipt ${index + 1}`}
                    className="w-full h-24 object-cover rounded-md border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // If image fails to load, show a placeholder or log error
                      target.style.backgroundColor = '#f3f4f6';
                      target.style.display = 'flex';
                      target.style.alignItems = 'center';
                      target.style.justifyContent = 'center';
                      console.error('Failed to load image:', photo);
                    }}
                    loading="lazy"
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

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : (initialData ? "Update Expense" : "Add Expense")}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;

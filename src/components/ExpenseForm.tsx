import { useState } from "react";
import { Expense, CardType } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload , X} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [cardType, setCardType] = useState<CardType>(initialData?.cardType || "visa");
  const [receiptUrl, setReceiptUrl] = useState<string[]>(initialData?.receiptUrl ? [initialData.receiptUrl] : []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!supermarketName || !purchaseDate || !amount) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const expense: Expense = {
      id: initialData?.id || crypto.randomUUID(),
      supermarketName,
      purchaseDate,
      amount: parseFloat(amount),
      cardType,
      receiptUrl: receiptUrl.length > 0 ? receiptUrl[0] : undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
    };

    try {
      await onSubmit(expense);

      if (!initialData) {
        setSupermarketName("");
        setPurchaseDate("");
        setAmount("");
        setCardType("visa");
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
              <Select value={cardType} onValueChange={(value) => setCardType(value as CardType)}>
                <SelectTrigger id="card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="amex">Amex</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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

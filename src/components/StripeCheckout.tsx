import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { initializeStripeCheckout } from "@/lib/stripe";
import { Loader2, CreditCard } from "lucide-react";

interface StripeCheckoutProps {
  planId: string;
  planName: string;
  priceMonthly: number;
  priceYearly: number;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StripeCheckout({
  planId,
  planName,
  priceMonthly,
  priceYearly,
  organizationId,
  open,
  onOpenChange,
}: StripeCheckoutProps) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleCheckout = async () => {
    setIsProcessing(true);

    try {
      const result = await initializeStripeCheckout({
        planId,
        organizationId,
        billingInterval,
      });

      if (!result) {
        toast({
          title: "Error",
          description: "No se pudo iniciar el proceso de pago. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPrice = billingInterval === 'monthly' ? priceMonthly : priceYearly;
  const savings = billingInterval === 'yearly' ? ((priceMonthly * 12) - priceYearly) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Suscribirse a {planName}
          </DialogTitle>
          <DialogDescription>
            Selecciona tu período de facturación y procede al pago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Período de Facturación</Label>
            <RadioGroup
              value={billingInterval}
              onValueChange={(value) => setBillingInterval(value as 'monthly' | 'yearly')}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="flex-1 cursor-pointer">
                  <div className="font-medium">Mensual</div>
                  <div className="text-sm text-muted-foreground">
                    ${priceMonthly.toFixed(2)}/mes
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="flex-1 cursor-pointer">
                  <div className="font-medium">Anual</div>
                  <div className="text-sm text-muted-foreground">
                    ${priceYearly.toFixed(2)}/año
                    {savings > 0 && (
                      <span className="ml-2 text-green-600 font-medium">
                        (Ahorra ${savings.toFixed(2)})
                      </span>
                    )}
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Plan:</span>
              <span className="text-sm">{planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Período:</span>
              <span className="text-sm capitalize">{billingInterval === 'monthly' ? 'Mensual' : 'Anual'}</span>
            </div>
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total:</span>
              <span>${selectedPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Proceder al Pago
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

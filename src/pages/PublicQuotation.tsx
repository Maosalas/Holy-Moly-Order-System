import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QUOTE_STATUS_LABEL, formatCRC, formatDate, type PublicQuote } from "@/types/quote";
import { downloadQuotationPdf } from "@/lib/quotationPdf";

export default function PublicQuotation() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_quotation_by_public_token", {
      _token: token,
    } as never);
    if (error) toast.error("No se pudo cargar la cotización");
    setQuote((data as unknown as PublicQuote) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    const { data, error } = await supabase.rpc("accept_quotation_by_public_token", {
      _token: token,
    } as never);
    setAccepting(false);
    if (error) {
      toast.error("No se pudo aceptar la cotización");
      return;
    }
    const res = data as any;
    if (res?.ok) toast.success(res.message || "¡Cotización aceptada!");
    else toast.error(res?.message || "No se pudo aceptar la cotización");
    load();
  };

  const pdf = () => {
    if (!quote) return;
    downloadQuotationPdf({
      number: quote.number,
      orgName: quote.orgName,
      orgLogoUrl: quote.orgLogoUrl,
      clientName: quote.clientName,
      clientPhone: quote.clientPhone,
      quoteDate: quote.quoteDate,
      validUntil: quote.validUntil,
      deliveryDate: quote.deliveryDate,
      items: quote.items,
      extras: quote.extras,
      packagingTotal: quote.packagingTotal,
      rushSurcharge: quote.rushSurcharge,
      discountAmount: quote.discountAmount,
      taxAmount: quote.taxAmount,
      total: quote.total,
      depositPct: quote.depositPct,
      depositAmount: quote.depositAmount,
      clientNotes: quote.clientNotes,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Cotización no encontrada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El enlace no es válido o fue dado de baja. Pedí uno nuevo al negocio.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {quote.orgLogoUrl && (
                <img src={quote.orgLogoUrl} alt={quote.orgName || ""} className="h-12 w-12 rounded object-cover" />
              )}
              <div>
                <CardTitle>{quote.orgName || "Cotización"}</CardTitle>
                <p className="text-sm text-muted-foreground">Cotización {quote.number}</p>
              </div>
            </div>
            <Badge>{QUOTE_STATUS_LABEL[quote.status]}</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Cliente</p>
                <p className="font-medium">{quote.clientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(quote.quoteDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Entrega</p>
                <p className="font-medium">{formatDate(quote.deliveryDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Vigencia</p>
                <p className="font-medium">{formatDate(quote.validUntil)}</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              {quote.items.map((i, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3">
                  <span>
                    {i.description} <span className="text-muted-foreground">× {i.qty}</span>
                  </span>
                  <span className="font-medium">{formatCRC(i.lineTotal)}</span>
                </div>
              ))}
              {quote.packagingTotal > 0 && (
                <div className="flex justify-between">
                  <span>Empaque</span>
                  <span className="font-medium">{formatCRC(quote.packagingTotal)}</span>
                </div>
              )}
              {quote.extras.map((e, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {e.name} <span className="text-muted-foreground">× {e.qty}</span>
                  </span>
                  <span className="font-medium">{formatCRC(e.total)}</span>
                </div>
              ))}
              {quote.rushSurcharge > 0 && (
                <div className="flex justify-between">
                  <span>Recargo por urgencia</span>
                  <span className="font-medium">{formatCRC(quote.rushSurcharge)}</span>
                </div>
              )}
              {quote.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Descuento</span>
                  <span className="font-medium">- {formatCRC(quote.discountAmount)}</span>
                </div>
              )}
              {quote.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Impuesto</span>
                  <span className="font-medium">{formatCRC(quote.taxAmount)}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatCRC(quote.total)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Anticipo ({quote.depositPct}%)</span>
              <span className="font-medium">{formatCRC(quote.depositAmount)}</span>
            </div>

            {quote.clientNotes && (
              <>
                <Separator />
                <p className="whitespace-pre-wrap text-muted-foreground">{quote.clientNotes}</p>
              </>
            )}

            <p className="pt-2 text-muted-foreground">
              Cotización válida hasta el {formatDate(quote.validUntil)}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          {quote.status === "enviada" && (
            <Button onClick={accept} disabled={accepting}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Aceptar cotización
            </Button>
          )}
          {quote.status === "aceptada" && (
            <Badge className="px-3 py-2">Ya aceptaste esta cotización. ¡Gracias!</Badge>
          )}
          <Button variant="outline" onClick={pdf}>
            <Download className="mr-2 h-4 w-4" /> Descargar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

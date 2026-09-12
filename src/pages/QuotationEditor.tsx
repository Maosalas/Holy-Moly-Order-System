import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  Plus,
  Search,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddQuoteItem,
  useCostingSettingsRow,
  useDecorationTiers,
  useDeleteQuoteExtra,
  useDeleteQuoteItem,
  useKeepQuotedPrices,
  useQuote,
  useQuoteDrift,
  useQuoteExtras,
  useQuoteItems,
  useRefreshQuotePrices,
  useSaveQuoteExtra,
  useSendQuote,
  useUpdateQuote,
  useUpdateQuoteItem,
} from "@/hooks/use-quoter";
import {
  EXTRA_KIND_LABEL,
  QUOTE_STATUS_LABEL,
  formatCRC,
  formatDate,
  type QuoteExtraKind,
  type QuoteItem,
} from "@/types/quote";
import { downloadQuotationPdf } from "@/lib/quotationPdf";

const RUSH_DAYS = 3;

const useOrgProducts = () =>
  useQuery({
    queryKey: ["quoter_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, active")
        .eq("active", true)
        .order("name");
      if (error) throw new Error(error.message);
      return (data || []) as { id: string; name: string; category: string | null }[];
    },
  });

const useCatalog = () =>
  useQuery({
    queryKey: ["quoter_catalog"],
    queryFn: async () => {
      const [sizes, variants, optionals] = await Promise.all([
        supabase.from("product_sizes").select("id, product_id, name, is_default, sort_order").order("sort_order"),
        supabase.from("product_variants").select("id, product_id, name, is_default, sort_order").order("sort_order"),
        supabase.from("product_components").select("id, product_id").eq("is_optional", true),
      ]);
      if (sizes.error) throw new Error(sizes.error.message);
      if (variants.error) throw new Error(variants.error.message);
      if (optionals.error) throw new Error(optionals.error.message);
      return {
        sizes: (sizes.data || []) as any[],
        variants: (variants.data || []) as any[],
        optionals: (optionals.data || []) as any[],
      };
    },
  });

export default function QuotationEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: quote, isLoading } = useQuote(id);
  const { data: items = [] } = useQuoteItems(id);
  const { data: extras = [] } = useQuoteExtras(id);
  const { data: products = [] } = useOrgProducts();
  const { data: catalog } = useCatalog();
  const { data: tiers = [] } = useDecorationTiers();
  const { data: settings } = useCostingSettingsRow();

  const isDraft = quote?.status === "borrador";
  const { data: drift } = useQuoteDrift(id, !!quote && !isDraft);

  const updateQuote = useUpdateQuote();
  const addItem = useAddQuoteItem();
  const updateItem = useUpdateQuoteItem();
  const deleteItem = useDeleteQuoteItem();
  const saveExtra = useSaveQuoteExtra();
  const deleteExtra = useDeleteQuoteExtra();
  const sendQuote = useSendQuote();
  const refreshPrices = useRefreshQuotePrices();
  const keepPrices = useKeepQuotedPrices();

  const [clientView, setClientView] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target as HTMLElement)?.closest("input, textarea"))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sizesOf = (productId: string | null) =>
    (catalog?.sizes || []).filter((s) => s.product_id === productId);
  const variantsOf = (productId: string | null) =>
    (catalog?.variants || []).filter((v) => v.product_id === productId);
  const optionalsOf = (productId: string | null) =>
    (catalog?.optionals || []).filter((o) => o.product_id === productId).map((o) => o.id as string);

  const productName = (item: QuoteItem) =>
    item.description || products.find((p) => p.id === item.product_id)?.name || "Línea";

  const daysToDelivery = useMemo(() => {
    if (!quote?.delivery_date) return null;
    const diff = new Date(quote.delivery_date).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  }, [quote?.delivery_date]);

  const showRush =
    isDraft &&
    daysToDelivery !== null &&
    daysToDelivery <= RUSH_DAYS &&
    Number(quote?.rush_surcharge || 0) === 0 &&
    Number(settings?.rush_surcharge_pct || 0) > 0;

  const belowMinimum =
    Number(settings?.min_order_amount || 0) > 0 &&
    Number(quote?.total || 0) > 0 &&
    Number(quote?.total || 0) < Number(settings?.min_order_amount || 0);

  const addProduct = async (productId: string) => {
    if (!id) return;
    const sizes = sizesOf(productId);
    const variants = variantsOf(productId);
    const size = sizes.find((s) => s.is_default) || sizes[0];
    const variant = variants.find((v) => v.is_default) || variants[0];
    try {
      const res = await addItem.mutateAsync({
        quotation_id: id,
        item_type: "product",
        product_id: productId,
        size_id: size?.id ?? null,
        variant_id: variant?.id ?? null,
        optional_ids: [],
        qty: 1,
        sort_order: items.length,
      });
      setSearchOpen(false);
      if (res.warning) toast.warning(res.warning);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const patchItem = async (item: QuoteItem, input: Partial<QuoteItem>, keepPrice = false) => {
    if (!id) return;
    try {
      const res = await updateItem.mutateAsync({ id: item.id, quotationId: id, input, keepPrice });
      if (res?.warning) toast.warning(res.warning, { duration: 6000 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const patchQuote = (input: any) => {
    if (!id) return;
    updateQuote.mutate({ id, input }, { onError: (e: any) => toast.error(e.message) });
  };

  const applyRush = () => {
    const pct = Number(settings?.rush_surcharge_pct || 0);
    saveExtra.mutate(
      {
        quotationId: id!,
        input: {
          quotation_id: id!,
          name: `Recargo por urgencia (${pct}%)`,
          kind: "otro" as QuoteExtraKind,
          qty: 1,
          unit_price: Math.round((Number(quote?.items_subtotal || 0) * pct) / 100),
        },
      },
      { onError: (e: any) => toast.error(e.message) }
    );
  };

  const publicLink = quote ? `${window.location.origin}/cotizacion/${quote.public_token}` : "";

  const pdf = async () => {
    if (!quote) return;
    const { data: org } = await supabase
      .from("organizations")
      .select("name, logo_url")
      .eq("id", quote.organization_id)
      .maybeSingle();
    await downloadQuotationPdf({
      number: quote.number || "Borrador",
      orgName: (org as any)?.name,
      orgLogoUrl: (org as any)?.logo_url,
      clientName: quote.client_name,
      clientPhone: quote.client_phone,
      quoteDate: quote.quote_date,
      validUntil: quote.valid_until,
      deliveryDate: quote.delivery_date,
      items: items.map((i) => ({
        description: productName(i),
        qty: Number(i.qty),
        unitPrice: Number(i.unit_price),
        lineTotal: Number(i.line_total),
      })),
      extras: extras.map((e) => ({
        name: e.name,
        qty: Number(e.qty),
        unitPrice: Number(e.unit_price),
        total: Number(e.total),
      })),
      packagingTotal: Number(quote.packaging_total),
      rushSurcharge: Number(quote.rush_surcharge),
      discountAmount: Number(quote.discount_amount),
      taxAmount: Number(quote.tax_amount),
      total: Number(quote.total),
      depositPct: Number(quote.deposit_pct),
      depositAmount: Number(quote.deposit_amount),
      clientNotes: quote.client_notes,
    });
  };

  if (isLoading || !quote) {
    return <p className="p-8 text-sm text-muted-foreground">Cargando cotización…</p>;
  }

  const showCosts = !clientView;

  return (
    <div className="space-y-4 pb-40">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotations")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{quote.number}</h1>
            <p className="text-sm text-muted-foreground">
              {QUOTE_STATUS_LABEL[quote.status]} · vigente hasta {formatDate(quote.valid_until)}
            </p>
          </div>
          <Badge variant="secondary">{QUOTE_STATUS_LABEL[quote.status]}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setClientView(!clientView)}>
            {clientView ? <Eye className="mr-2 h-4 w-4" /> : <EyeOff className="mr-2 h-4 w-4" />}
            {clientView ? "Vista cliente" : "Vista interna"}
          </Button>
          <Button variant="outline" onClick={pdf}>
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(publicLink);
              toast.success("Enlace copiado");
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copiar enlace
          </Button>
          {isDraft && (
            <Button
              onClick={() =>
                sendQuote.mutate(quote.id, {
                  onSuccess: () => toast.success("Cotización enviada y congelada"),
                  onError: (e: any) => toast.error(e.message),
                })
              }
            >
              <Send className="mr-2 h-4 w-4" /> Enviar
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de costos cambiados */}
      {quote.costs_changed && drift && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Los costos cambiaron</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Esta cotización se congeló el {formatDate(quote.snapshot_at)}. Hoy los mismos productos
              cuestan {Math.abs(Number(drift.diff_pct)).toFixed(1)}%{" "}
              {Number(drift.diff_pct) >= 0 ? "más" : "menos"}.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  refreshPrices.mutate(
                    { quotationId: quote.id, itemIds: items.map((i) => i.id) },
                    {
                      onSuccess: () => toast.success("Precios actualizados"),
                      onError: (e: any) => toast.error(e.message),
                    }
                  )
                }
              >
                Actualizar precios
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  keepPrices.mutate(quote.id, {
                    onSuccess: () => toast.success("Se respeta lo cotizado"),
                    onError: (e: any) => toast.error(e.message),
                  })
                }
              >
                Respetar lo cotizado
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showRush && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Entrega muy cerca</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>
              Faltan {daysToDelivery} día(s) para la entrega. Podés cobrar el recargo por urgencia de{" "}
              {settings?.rush_surcharge_pct}%.
            </span>
            <Button size="sm" onClick={applyRush}>
              Aplicar recargo
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {belowMinimum && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pedido bajo el mínimo</AlertTitle>
          <AlertDescription>
            El total es {formatCRC(quote.total)} y tu pedido mínimo es{" "}
            {formatCRC(settings?.min_order_amount)}.
          </AlertDescription>
        </Alert>
      )}

      {/* Datos del cliente */}
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-4">
          <div>
            <Label className="text-xs">Cliente</Label>
            <Input
              defaultValue={quote.client_name}
              onBlur={(e) => e.target.value !== quote.client_name && patchQuote({ client_name: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Teléfono</Label>
            <Input
              defaultValue={quote.client_phone || ""}
              onBlur={(e) => patchQuote({ client_phone: e.target.value || null })}
            />
          </div>
          <div>
            <Label className="text-xs">Fecha de entrega</Label>
            <Input
              type="datetime-local"
              defaultValue={quote.delivery_date ? quote.delivery_date.slice(0, 16) : ""}
              onChange={(e) =>
                patchQuote({ delivery_date: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
            />
          </div>
          <div>
            <Label className="text-xs">Anticipo %</Label>
            <Input
              type="number"
              defaultValue={quote.deposit_pct}
              onBlur={(e) => patchQuote({ deposit_pct: Number(e.target.value || 0) })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Productos cotizados</CardTitle>
          <Button size="sm" onClick={() => setSearchOpen(true)}>
            <Search className="mr-2 h-4 w-4" /> Buscar producto
            <span className="ml-2 hidden rounded bg-muted px-1.5 text-xs text-muted-foreground md:inline">
              Ctrl K
            </span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Buscá un producto con Ctrl K y agregalo. Podés cotizar varios seguidos.
            </p>
          )}
          {items.map((item) => {
            const sizes = sizesOf(item.product_id);
            const variants = variantsOf(item.product_id);
            const optionals = optionalsOf(item.product_id);
            return (
              <div
                key={item.id}
                className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2 md:grid-cols-12"
              >
                <div className="col-span-2 md:col-span-3">
                  <Label className="text-xs text-muted-foreground">Producto</Label>
                  <p className="truncate text-sm font-medium">{productName(item)}</p>
                </div>

                {sizes.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Tamaño</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={item.size_id || ""}
                      onChange={(e) => patchItem(item, { size_id: e.target.value || null })}
                    >
                      <option value="">Base</option>
                      {sizes.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {variants.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Variante</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={item.variant_id || ""}
                      onChange={(e) => patchItem(item, { variant_id: e.target.value || null })}
                    >
                      <option value="">Base</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {tiers.length > 0 && (
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Decoración</Label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                      value={item.decoration_tier_id || ""}
                      onChange={(e) => patchItem(item, { decoration_tier_id: e.target.value || null })}
                    >
                      <option value="">Sin nivel</option>
                      {tiers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground">Cant.</Label>
                  <Input
                    type="number"
                    min={1}
                    className="h-9"
                    defaultValue={item.qty}
                    onBlur={(e) => {
                      const qty = Number(e.target.value || 1);
                      if (qty !== Number(item.qty)) patchItem(item, { qty });
                    }}
                  />
                </div>

                {showCosts && (
                  <div className="md:col-span-1">
                    <Label className="text-xs text-muted-foreground">Costo u.</Label>
                    <p className="h-9 rounded bg-muted px-2 py-2 text-xs">{formatCRC(item.unit_cost)}</p>
                  </div>
                )}

                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Precio u.</Label>
                  <Input
                    className="h-9"
                    value={prices[item.id] ?? String(Math.round(Number(item.unit_price)))}
                    onChange={(e) => setPrices({ ...prices, [item.id]: e.target.value })}
                    onBlur={(e) => {
                      const price = Number(e.target.value || 0);
                      setPrices((p) => {
                        const { [item.id]: _drop, ...rest } = p;
                        return rest;
                      });
                      if (price !== Number(item.unit_price)) patchItem(item, { unit_price: price }, true);
                    }}
                  />
                </div>

                {showCosts && (
                  <div className="md:col-span-1">
                    <Label className="text-xs text-muted-foreground">Margen</Label>
                    <p className="h-9 px-1 py-2 text-xs">
                      {item.margin_pct === null ? "—" : `${Number(item.margin_pct).toFixed(1)}%`}
                    </p>
                  </div>
                )}

                <div className="md:col-span-1">
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <p className="h-9 px-1 py-2 text-sm font-medium">{formatCRC(item.line_total)}</p>
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  {optionals.length > 0 && (
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={item.optional_ids?.length > 0}
                        onCheckedChange={(v) =>
                          patchItem(item, { optional_ids: v ? optionals : [] })
                        }
                      />
                      Opcionales
                    </label>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteItem.mutate({ id: item.id, quotationId: quote.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Extras */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Empaque y extras</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              saveExtra.mutate(
                {
                  quotationId: quote.id,
                  input: {
                    quotation_id: quote.id,
                    name: "Entrega",
                    kind: "entrega",
                    qty: 1,
                    unit_price: 0,
                    sort_order: extras.length,
                  },
                },
                { onError: (e: any) => toast.error(e.message) }
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Agregar extra
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid gap-2 md:grid-cols-4">
            <div>
              <Label className="text-xs">Empaque (₡)</Label>
              <Input
                type="number"
                defaultValue={quote.packaging_total}
                onBlur={(e) => patchQuote({ packaging_total: Number(e.target.value || 0) })}
              />
            </div>
            <div>
              <Label className="text-xs">Descuento (₡)</Label>
              <Input
                type="number"
                defaultValue={quote.discount_amount}
                onBlur={(e) => patchQuote({ discount_amount: Number(e.target.value || 0) })}
              />
            </div>
            <div>
              <Label className="text-xs">Recargo urgencia (₡)</Label>
              <Input
                type="number"
                defaultValue={quote.rush_surcharge}
                onBlur={(e) => patchQuote({ rush_surcharge: Number(e.target.value || 0) })}
              />
            </div>
          </div>

          {extras.map((extra) => (
            <div key={extra.id} className="grid grid-cols-2 items-end gap-2 rounded-lg border p-2 md:grid-cols-12">
              <div className="md:col-span-4">
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <Input
                  className="h-9"
                  defaultValue={extra.name}
                  onBlur={(e) =>
                    saveExtra.mutate({
                      id: extra.id,
                      quotationId: quote.id,
                      input: { ...extra, quotation_id: quote.id, name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={extra.kind}
                  onChange={(e) =>
                    saveExtra.mutate({
                      id: extra.id,
                      quotationId: quote.id,
                      input: { ...extra, quotation_id: quote.id, kind: e.target.value as QuoteExtraKind },
                    })
                  }
                >
                  {Object.entries(EXTRA_KIND_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-muted-foreground">Precio</Label>
                <Input
                  className="h-9"
                  type="number"
                  defaultValue={extra.unit_price}
                  onBlur={(e) =>
                    saveExtra.mutate({
                      id: extra.id,
                      quotationId: quote.id,
                      input: { ...extra, quotation_id: quote.id, unit_price: Number(e.target.value || 0) },
                    })
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs text-muted-foreground">Cant.</Label>
                <Input
                  className="h-9"
                  type="number"
                  defaultValue={extra.qty}
                  onBlur={(e) =>
                    saveExtra.mutate({
                      id: extra.id,
                      quotationId: quote.id,
                      input: { ...extra, quotation_id: quote.id, qty: Number(e.target.value || 1) },
                    })
                  }
                />
              </div>
              <div className="md:col-span-1">
                <Label className="text-xs text-muted-foreground">Total</Label>
                <p className="h-9 px-1 py-2 text-sm font-medium">{formatCRC(extra.total)}</p>
              </div>
              {showCosts && (
                <label className="flex items-center gap-2 text-xs md:col-span-1">
                  <Checkbox
                    checked={extra.is_cost}
                    onCheckedChange={(v) =>
                      saveExtra.mutate({
                        id: extra.id,
                        quotationId: quote.id,
                        input: { ...extra, quotation_id: quote.id, is_cost: !!v },
                      })
                    }
                  />
                  Es costo
                </label>
              )}
              <div className="md:col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteExtra.mutate({ id: extra.id, quotationId: quote.id })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2">
          <div>
            <Label className="text-xs">Notas para el cliente</Label>
            <Textarea
              defaultValue={quote.client_notes || ""}
              onBlur={(e) => patchQuote({ client_notes: e.target.value || null })}
            />
          </div>
          {showCosts && (
            <div>
              <Label className="text-xs">Notas internas</Label>
              <Textarea
                defaultValue={quote.internal_notes || ""}
                onBlur={(e) => patchQuote({ internal_notes: e.target.value || null })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totales fijos */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 px-4 py-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap gap-5">
            <span>
              Productos <strong>{formatCRC(quote.items_subtotal)}</strong>
            </span>
            <span>
              Empaque <strong>{formatCRC(quote.packaging_total)}</strong>
            </span>
            <span>
              Extras <strong>{formatCRC(quote.extras_total)}</strong>
            </span>
            {Number(quote.tax_amount) > 0 && (
              <span>
                Impuesto <strong>{formatCRC(quote.tax_amount)}</strong>
              </span>
            )}
            {showCosts && (
              <>
                <span className="text-muted-foreground">
                  Costo <strong>{formatCRC(quote.cost_total)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Margen{" "}
                  <strong>
                    {quote.margin_pct === null ? "—" : `${Number(quote.margin_pct).toFixed(1)}%`}
                  </strong>
                </span>
                <span className="text-muted-foreground">
                  Trabajo <strong>{Math.round(Number(quote.labor_minutes))} min</strong>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-6">
            <span className="text-muted-foreground">
              Anticipo <strong>{formatCRC(quote.deposit_amount)}</strong>
            </span>
            <span className="text-lg font-semibold">Total {formatCRC(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* Buscador con teclado */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Buscar producto…" />
        <CommandList>
          <CommandEmpty>No hay productos con ese nombre.</CommandEmpty>
          <CommandGroup heading="Productos">
            {products.map((p) => (
              <CommandItem key={p.id} value={p.name} onSelect={() => addProduct(p.id)}>
                {p.name}
                {p.category && <span className="ml-2 text-xs text-muted-foreground">{p.category}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

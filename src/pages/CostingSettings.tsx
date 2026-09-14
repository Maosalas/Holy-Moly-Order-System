import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { SearchSelect } from "@/components/ui/search-select";

type CostingSettings = {
  organization_id: string;
  currency: string;
  price_rounding: number;
  include_labor: boolean;
  hourly_rate: number;
  include_energy: boolean;
  oven_kw: number;
  kwh_price: number;
  overhead_percent: number;
  production_loss_pct: number;
  default_margin_pct: number;
  min_margin_pct: number;
  tax_enabled: boolean;
  tax_percent: number;
  quote_valid_days: number;
  deposit_percent: number;
  min_order_amount: number;
  rush_surcharge_pct: number;
  cost_method: string;
};

const EXAMPLE_MATERIALS = 3500;
const EXAMPLE_HOURS = 1;

const formatCRC = (value: number) =>
  new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value);

export default function CostingSettings() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [settings, setSettings] = useState<CostingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [example, setExample] = useState<number | null>(null);
  const [exampleError, setExampleError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("costing_settings")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!active) return;
      if (error) {
        toast({ title: "Error", description: "No se pudo cargar la configuración de costeo.", variant: "destructive" });
      } else if (data) {
        setSettings(data as unknown as CostingSettings);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [orgId]);

  const exampleKey = useMemo(
    () =>
      settings
        ? JSON.stringify([
            settings.include_labor,
            settings.hourly_rate,
            settings.include_energy,
            settings.oven_kw,
            settings.kwh_price,
            settings.overhead_percent,
            settings.production_loss_pct,
            settings.default_margin_pct,
            settings.tax_enabled,
            settings.tax_percent,
            settings.price_rounding,
          ])
        : "",
    [settings]
  );

  useEffect(() => {
    if (!settings) return;
    let active = true;
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc("fn_costing_price", {
        p_materials: EXAMPLE_MATERIALS,
        p_hours: EXAMPLE_HOURS,
        p_include_labor: settings.include_labor,
        p_hourly_rate: settings.hourly_rate,
        p_include_energy: settings.include_energy,
        p_oven_kw: settings.oven_kw,
        p_kwh_price: settings.kwh_price,
        p_overhead_percent: settings.overhead_percent,
        p_production_loss_pct: settings.production_loss_pct,
        p_margin_pct: settings.default_margin_pct,
        p_tax_enabled: settings.tax_enabled,
        p_tax_percent: settings.tax_percent,
        p_price_rounding: settings.price_rounding,
      } as never);
      if (!active) return;
      if (error) {
        setExample(null);
        setExampleError(error.message);
      } else {
        setExampleError(null);
        setExample(Number(data));
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleKey]);

  const update = <K extends keyof CostingSettings>(key: K, value: CostingSettings[K]) =>
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));

  const numberField = (
    key: keyof CostingSettings,
    label: string,
    help?: string,
    step = "1"
  ) => (
    <div className="space-y-2">
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        type="number"
        step={step}
        value={settings ? String(settings[key] ?? "") : ""}
        onChange={(e) => update(key, (e.target.value === "" ? 0 : Number(e.target.value)) as never)}
      />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );

  const switchField = (key: keyof CostingSettings, label: string, help?: string) => (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5 pr-4">
        <Label htmlFor={String(key)}>{label}</Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <Switch
        id={String(key)}
        checked={Boolean(settings?.[key])}
        onCheckedChange={(v) => update(key, v as never)}
      />
    </div>
  );

  const handleSave = async () => {
    if (!settings || !orgId) return;
    setSaving(true);
    const { organization_id: _omit, ...payload } = settings;
    const { error } = await supabase
      .from("costing_settings")
      .update(payload as never)
      .eq("organization_id", orgId);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
      return;
    }
    toast({ title: "Guardado", description: "La configuración de costeo se actualizó." });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">No hay configuración de costeo para esta organización.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configuración de costeo</h1>
          <p className="text-muted-foreground">
            Define cómo se calculan los costos y los precios de venta de tus productos.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mano de obra</CardTitle>
          <CardDescription>Cuánto vale el tiempo de trabajo dedicado a cada producto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {switchField("include_labor", "Incluir mano de obra", "Suma el tiempo de trabajo al costo del producto.")}
          {numberField("hourly_rate", "Tarifa por hora (₡)", "Costo de una hora de trabajo.", "50")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Energía</CardTitle>
          <CardDescription>Consumo eléctrico del horno durante la producción.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {switchField("include_energy", "Incluir energía", "Suma el consumo del horno al costo del producto.")}
          <div className="grid gap-4 sm:grid-cols-2">
            {numberField("oven_kw", "Potencia del horno (kW)", "Kilovatios que consume el horno.", "0.1")}
            {numberField("kwh_price", "Precio del kWh (₡)", "Lo que cobra la compañía eléctrica.", "1")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Costos indirectos</CardTitle>
          <CardDescription>Gastos generales y pérdidas propias de la producción.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {numberField("overhead_percent", "Costos indirectos (%)", "Alquiler, agua, empaque y otros gastos generales.", "0.5")}
          {numberField("production_loss_pct", "Pérdida de producción (%)", "Merma esperada de materia prima.", "0.5")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios e impuestos</CardTitle>
          <CardDescription>Márgenes, redondeo e impuesto sobre las ventas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {numberField("default_margin_pct", "Margen objetivo (%)", "Ganancia que quieres obtener.", "0.5")}
            {numberField("min_margin_pct", "Margen mínimo (%)", "Nunca vendas por debajo de este margen.", "0.5")}
            {numberField("price_rounding", "Redondeo de precio (₡)", "Los precios siempre se redondean hacia arriba.", "50")}
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => update("currency", e.target.value)}
              />
            </div>
          </div>
          {switchField("tax_enabled", "Cobrar impuesto", "Agrega el impuesto al precio final.")}
          {numberField("tax_percent", "Impuesto (%)", undefined, "0.5")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comercial</CardTitle>
          <CardDescription>Condiciones de tus cotizaciones y pedidos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {numberField("quote_valid_days", "Validez de la cotización (días)")}
          {numberField("deposit_percent", "Adelanto requerido (%)", "Porcentaje que se cobra al reservar.", "0.5")}
          {numberField("min_order_amount", "Monto mínimo de pedido (₡)", undefined, "100")}
          {numberField("rush_surcharge_pct", "Recargo por urgencia (%)", "Se aplica a pedidos con poco tiempo.", "0.5")}
          <div className="space-y-2">
            <Label htmlFor="cost_method">Método de costeo</Label>
            <SearchSelect
              id="cost_method"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={settings.cost_method}
              onChange={(e) => update("cost_method", e.target.value)}
            >
              <option value="weighted_average">Promedio ponderado</option>
              <option value="last_cost">Último costo</option>
              <option value="fifo">Primero en entrar, primero en salir</option>
            </SearchSelect>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Ejemplo en vivo</CardTitle>
        </CardHeader>
        <CardContent>
          {exampleError ? (
            <p className="text-sm text-destructive">{exampleError}</p>
          ) : (
            <p className="text-base">
              Con estos valores, un producto con {formatCRC(EXAMPLE_MATERIALS)} de insumos y 1 hora de trabajo se
              vende en{" "}
              <span className="font-bold text-xl">
                {example === null ? "…" : formatCRC(example)}
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pb-6">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  parseCsv,
  fetchUnits,
  mapIngredientRows,
  mapSupplyRows,
  downloadCsv,
  INGREDIENT_TEMPLATE,
  SUPPLY_TEMPLATE,
  type RowError,
} from "@/lib/csvImport";

type Mode = "ingredients" | "supplies";

interface CsvImportDialogProps {
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Crea un registro; debe lanzar error si falla */
  onCreate: (payload: any) => Promise<unknown>;
  onFinished?: () => void;
}

const COPY: Record<Mode, { title: string; columns: string; template: string; file: string }> = {
  ingredients: {
    title: "Importar ingredientes por CSV",
    columns:
      "nombre, proveedor, cantidad, unidad, costo, unidad_base (g, ml o unidad), densidad_g_ml, peso_por_unidad_g, merma_pct, categoria",
    template: INGREDIENT_TEMPLATE,
    file: "plantilla-ingredientes.csv",
  },
  supplies: {
    title: "Importar suministros por CSV",
    columns: "nombre, proveedor, cantidad, unidad, costo",
    template: SUPPLY_TEMPLATE,
    file: "plantilla-suministros.csv",
  },
};

export function CsvImportDialog({
  mode,
  open,
  onOpenChange,
  onCreate,
  onFinished,
}: CsvImportDialogProps) {
  const copy = COPY[mode];
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setIsReading(true);
    try {
      const text = await file.text();
      const { rows: csvRows } = parseCsv(text);
      if (!csvRows.length) {
        toast({
          variant: "destructive",
          title: "Archivo vacío",
          description: "El archivo no tiene filas de datos debajo del encabezado.",
        });
        reset();
        return;
      }
      const units = await fetchUnits();
      const result =
        mode === "ingredients" ? mapIngredientRows(csvRows, units) : mapSupplyRows(csvRows, units);
      setFileName(file.name);
      setRows(result.payloads);
      setErrors(result.errors);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "No se pudo leer el archivo",
        description: e?.message || "Revisá que sea un archivo CSV válido.",
      });
      reset();
    } finally {
      setIsReading(false);
    }
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setIsImporting(true);
    let ok = 0;
    const failed: string[] = [];
    for (const payload of rows) {
      try {
        await onCreate(payload);
        ok++;
      } catch (e: any) {
        failed.push(`${payload.name}: ${e?.message || "error al guardar"}`);
      }
    }
    setIsImporting(false);
    if (ok > 0) {
      toast({
        title: "Importación completada",
        description: `Se agregaron ${ok} registro${ok === 1 ? "" : "s"}.${
          failed.length ? ` ${failed.length} no se pudieron guardar.` : ""
        }`,
      });
    }
    if (failed.length) {
      toast({
        variant: "destructive",
        title: "Algunas filas no se guardaron",
        description: failed.slice(0, 5).join(" · "),
      });
    }
    onFinished?.();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            Columnas del archivo: {copy.columns}. Descargá la plantilla para ver un ejemplo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => downloadCsv(copy.file, copy.template)}
            >
              <Download className="h-4 w-4" />
              Descargar plantilla
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => inputRef.current?.click()}
              disabled={isReading || isImporting}
            >
              <Upload className="h-4 w-4" />
              {fileName ? "Elegir otro archivo" : "Elegir archivo CSV"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              {fileName} · {rows.length} fila{rows.length === 1 ? "" : "s"} lista
              {rows.length === 1 ? "" : "s"} para importar
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {errors.length} fila{errors.length === 1 ? "" : "s"} con problemas (no se importarán)
              </AlertTitle>
              <AlertDescription>
                <ScrollArea className="max-h-40 pr-3">
                  <ul className="list-disc pl-4 space-y-1 text-sm">
                    {errors.map((err) => (
                      <li key={`${err.line}-${err.message}`}>
                        Fila {err.line}: {err.message}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {rows.length > 0 && (
            <ScrollArea className="max-h-56 rounded-md border">
              <table className="w-full text-sm">
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={`${r.name}-${i}`} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.provider || r.supplierName}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {r.qtyProvider ?? r.quantity} {r.units || r.unit}
                      </td>
                      <td className="px-3 py-2 text-right">₡{r.cost.toLocaleString("es-CR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!rows.length || isImporting}>
            {isImporting ? "Importando..." : `Importar ${rows.length || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

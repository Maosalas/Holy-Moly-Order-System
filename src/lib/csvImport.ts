/**
 * Utilidades para importar ingredientes y suministros desde CSV.
 * Solo valida y normaliza filas: los cálculos de costo siguen en la base de datos.
 */
import { supabase } from "@/integrations/supabase/client";

export type CsvRow = Record<string, string>;

/** Parser CSV tolerante: separador , o ;, comillas dobles y saltos de línea CRLF/LF */
export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean);
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      record.push(field);
      field = "";
    } else if (ch === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  record.push(field);
  records.push(record);

  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((h) => normalizeHeader(h));
  const rows = nonEmpty.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/)[0] || "";
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semis > commas ? ";" : ",";
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function toNumber(value: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/\s/g, "").replace(/₡|\$/g, "");
  // Soporta 1.234,56 y 1234.56
  const cleaned =
    normalized.includes(",") && normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export interface RowError {
  line: number;
  message: string;
}

export interface UnitInfo {
  code: string;
  magnitude: string;
  factor_to_base: number;
}

export async function fetchUnits(): Promise<UnitInfo[]> {
  const { data, error } = await supabase.from("units").select("code, magnitude, factor_to_base");
  if (error) throw new Error(error.message);
  return (data || []) as UnitInfo[];
}

const BASE_UNITS: Record<string, string> = { g: "mass", ml: "volume", unidad: "count" };

export const INGREDIENT_TEMPLATE = [
  "nombre,proveedor,cantidad,unidad,costo,unidad_base,densidad_g_ml,peso_por_unidad_g,merma_pct,categoria",
  "Harina,Distribuidora Central,1,kg,1200,g,,,0,Secos",
  "Leche,Dos Pinos,1,l,1450,ml,1.03,,0,Lácteos",
  "Huevo,Granja Local,30,unidad,4500,unidad,,55,0,Frescos",
].join("\n");

export const SUPPLY_TEMPLATE = [
  "nombre,proveedor,cantidad,unidad,costo",
  "Caja para torta 8,Empaques CR,25,unidad,11250",
  "Base de cartón,Empaques CR,50,unidad,10000",
].join("\n");

export interface IngredientCsvPayload {
  name: string;
  provider: string;
  qtyProvider: number;
  units: string;
  cost: number;
  baseUnit: string;
  densityGMl: number | null;
  unitWeightG: number | null;
  wastePct: number;
  category: string | null;
}

export function mapIngredientRows(
  rows: CsvRow[],
  units: UnitInfo[]
): { payloads: IngredientCsvPayload[]; errors: RowError[] } {
  const payloads: IngredientCsvPayload[] = [];
  const errors: RowError[] = [];
  const unitByCode = new Map(units.map((u) => [u.code.toLowerCase(), u]));
  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    const line = idx + 2;
    const name = (row.nombre || row.name || "").trim();
    const provider = (row.proveedor || row.provider || "").trim();
    const qty = toNumber(row.cantidad || row.qty || row.qty_provider || "");
    const unit = (row.unidad || row.units || row.unit || "").trim().toLowerCase();
    const cost = toNumber(row.costo || row.cost || row.precio || "");
    const baseUnit = (row.unidad_base || row.base_unit || "").trim().toLowerCase();
    const density = toNumber(row.densidad_g_ml || row.density_g_ml || "");
    const unitWeight = toNumber(row.peso_por_unidad_g || row.unit_weight_g || "");
    const waste = toNumber(row.merma_pct || row.waste_pct || "") ?? 0;
    const category = (row.categoria || row.category || "").trim() || null;

    if (!name) return errors.push({ line, message: "Falta el nombre del ingrediente." });
    if (seen.has(name.toLowerCase()))
      return errors.push({ line, message: `"${name}" está repetido en el archivo.` });
    if (!provider) return errors.push({ line, message: `"${name}": falta el proveedor.` });
    if (qty === null || qty <= 0)
      return errors.push({ line, message: `"${name}": la cantidad debe ser mayor que cero.` });
    if (cost === null || cost < 0)
      return errors.push({ line, message: `"${name}": el costo no es un número válido.` });
    if (!unitByCode.has(unit))
      return errors.push({
        line,
        message: `"${name}": la unidad "${row.unidad || row.units || ""}" no existe. Usá por ejemplo g, kg, ml, l o unidad.`,
      });
    if (!BASE_UNITS[baseUnit])
      return errors.push({
        line,
        message: `"${name}": la unidad base debe ser g, ml o unidad.`,
      });

    const fromMagnitude = unitByCode.get(unit)!.magnitude;
    const toMagnitude = BASE_UNITS[baseUnit];
    if (fromMagnitude !== toMagnitude) {
      if (
        (fromMagnitude === "volume" && toMagnitude === "mass") ||
        (fromMagnitude === "mass" && toMagnitude === "volume")
      ) {
        if (!density || density <= 0)
          return errors.push({
            line,
            message: `"${name}": para pasar de ${unit} a ${baseUnit} hace falta la densidad (g/ml).`,
          });
      } else if (fromMagnitude === "count" || toMagnitude === "count") {
        if (!unitWeight || unitWeight <= 0)
          return errors.push({
            line,
            message: `"${name}": para pasar de ${unit} a ${baseUnit} hace falta el peso por unidad en gramos.`,
          });
      } else {
        return errors.push({
          line,
          message: `"${name}": no se puede convertir de ${unit} a ${baseUnit}.`,
        });
      }
    }

    seen.add(name.toLowerCase());
    payloads.push({
      name,
      provider,
      qtyProvider: qty,
      units: unit,
      cost,
      baseUnit,
      densityGMl: density ?? null,
      unitWeightG: unitWeight ?? null,
      wastePct: waste,
      category,
    });
  });

  return { payloads, errors };
}

export interface SupplyCsvPayload {
  name: string;
  supplierName: string;
  quantity: number;
  unit: string;
  cost: number;
}

export function mapSupplyRows(
  rows: CsvRow[],
  units: UnitInfo[]
): { payloads: SupplyCsvPayload[]; errors: RowError[] } {
  const payloads: SupplyCsvPayload[] = [];
  const errors: RowError[] = [];
  const validCodes = new Set(units.map((u) => u.code.toLowerCase()));
  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    const line = idx + 2;
    const name = (row.nombre || row.name || "").trim();
    const supplier = (row.proveedor || row.supplier_name || row.proveedor_nombre || "").trim();
    const quantity = toNumber(row.cantidad || row.quantity || "");
    const unit = (row.unidad || row.unit || "").trim().toLowerCase();
    const cost = toNumber(row.costo || row.cost || row.precio || "");

    if (!name) return errors.push({ line, message: "Falta el nombre del suministro." });
    if (seen.has(name.toLowerCase()))
      return errors.push({ line, message: `"${name}" está repetido en el archivo.` });
    if (!supplier) return errors.push({ line, message: `"${name}": falta el proveedor.` });
    if (quantity === null || quantity <= 0)
      return errors.push({ line, message: `"${name}": la cantidad debe ser mayor que cero.` });
    if (cost === null || cost < 0)
      return errors.push({ line, message: `"${name}": el costo no es un número válido.` });
    if (!validCodes.has(unit))
      return errors.push({
        line,
        message: `"${name}": la unidad "${row.unidad || row.unit || ""}" no existe. Usá por ejemplo g, kg, ml, l o unidad.`,
      });

    seen.add(name.toLowerCase());
    payloads.push({ name, supplierName: supplier, quantity, unit, cost });
  });

  return { payloads, errors };
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

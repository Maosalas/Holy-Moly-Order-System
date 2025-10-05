import { OrderSupply } from "./order";

export type Tamaño = "Unidad" | "Lunch Box Cake" | "Mini" | "Pequeño" | "Mediano" | "Grande";

export interface Otros {
    id: string;
    descripcion: string;
    cantidad: number;
    costo: number;
}
export interface Cotizacion {
    id: string;
    receta: string;
    tamaño: Tamaño;
    relleno: string;
    cubierta: string;
    miscelaneos: OrderSupply[];
    costAmount: number;
    totalCost: number;
    otros: Otros[];
    createdAt: string;
}
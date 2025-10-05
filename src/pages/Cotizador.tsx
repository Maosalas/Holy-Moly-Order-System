import { useState } from "react";
import { Cotizacion } from "@/types/cotizacion";

const Cotizaciones = () => {
    const [cotizacion, setCotizacion] = useState<Cotizacion[]>([]);
    return <div>Cotizador Page</div>;
}
export default Cotizaciones;
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCreateQuote, useDeleteQuote, useQuotes } from "@/hooks/use-quoter";
import { QUOTE_STATUS_LABEL, formatCRC, formatDate, type QuoteStatus } from "@/types/quote";

const statusVariant: Record<QuoteStatus, "default" | "secondary" | "destructive" | "outline"> = {
  borrador: "secondary",
  enviada: "default",
  aceptada: "default",
  rechazada: "destructive",
  vencida: "outline",
};

export default function Quotations() {
  const navigate = useNavigate();
  const { data: quotes = [], isLoading } = useQuotes();
  const createQuote = useCreateQuote();
  const deleteQuote = useDeleteQuote();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes;
    return quotes.filter(
      (q) =>
        q.client_name.toLowerCase().includes(term) ||
        (q.number || "").toLowerCase().includes(term)
    );
  }, [quotes, search]);

  const create = async () => {
    if (!clientName.trim()) {
      toast.error("Escribí el nombre del cliente");
      return;
    }
    try {
      const id = await createQuote.mutateAsync({
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
      });
      setOpen(false);
      setClientName("");
      setClientPhone("");
      navigate(`/quotations/${id}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cotizador</h1>
          <p className="text-sm text-muted-foreground">
            Cotizaciones con precios calculados a partir de tus productos.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nueva cotización
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cotizaciones</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-9"
              placeholder="Buscar por cliente o número…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay cotizaciones todavía.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((q) => (
                  <TableRow
                    key={q.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/quotations/${q.id}`)}
                  >
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {q.number}
                      </span>
                    </TableCell>
                    <TableCell>{q.client_name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</Badge>
                      {q.costs_changed && (
                        <Badge variant="outline" className="ml-2">
                          Costos cambiaron
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(q.quote_date)}</TableCell>
                    <TableCell>{formatDate(q.valid_until)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCRC(q.total)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Borrar la cotización ${q.number}?`)) {
                            deleteQuote.mutate(q.id, {
                              onError: (err: any) => toast.error(err.message),
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva cotización</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <Input
              placeholder="Teléfono (opcional)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={createQuote.isPending}>
              Crear y cotizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

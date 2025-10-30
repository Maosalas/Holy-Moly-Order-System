import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Phone, Package, DollarSign, CreditCard, Loader2 } from "lucide-react";
import { Expense } from "@/types/expense";

interface ExpensePreviewDialogProps {
    expense: Expense;
    onOpen?: () => Promise<Expense | null>;
    isLoadingImage?: boolean;
    setExpandedPhoto: (photo: string | null) => void;
}

export const ExpensePreviewDialog = ({ expense, setExpandedPhoto, onOpen, isLoadingImage = false }: ExpensePreviewDialogProps) => {
    const deliveryDate = new Date(expense.purchaseDate);

    const handleOpenChange = (open: boolean) => {
        if (open && onOpen) {
            onOpen();
        }
    };

    const hasReceipt = (expense as any).hasReceipt || !!expense.receiptUrl;

    return (
        <Dialog onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Preview Expense">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Compra en {expense.supermarketName}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Client Information */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Comercio</p>
                                <p className="font-semibold">{expense.supermarketName}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Fecha de compra</p>
                                </div>
                                <span className="font-semibold">{deliveryDate.toLocaleDateString('es-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Monto de gasto</p>
                                </div>
                                <span className="font-semibold">₡{expense.amount.toLocaleString()}</span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Tarjeta</p>
                                </div>
                                <span className="font-semibold">{expense.cardType.description}</span>
                            </div>
                        </div>
                    </div>

                    {/* Receipt Photo */}
                    {hasReceipt && (
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm text-muted-foreground">Foto del recibo</h3>
                            {isLoadingImage ? (
                                <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/50">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Cargando imagen...</span>
                                </div>
                            ) : expense.receiptUrl ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {Array.isArray(expense.receiptUrl)
                                        ? expense.receiptUrl.map((photo, index) => (
                                            <img
                                                key={index}
                                                src={photo}
                                                alt={`Client photo ${index + 1}`}
                                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setExpandedPhoto(photo)}
                                            />
                                        ))
                                        : (
                                            <img
                                                src={expense.receiptUrl}
                                                alt="Client photo"
                                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => setExpandedPhoto(expense.receiptUrl)}
                                            />
                                        )
                                    }
                                </div>
                            ) : (
                                <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-lg bg-muted/50">
                                    <p className="text-sm text-muted-foreground">
                                        Esperando para cargar la imagen...
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {!hasReceipt && (
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm text-muted-foreground">Foto del recibo</h3>
                            <div className="flex items-center justify-center p-4 border rounded-lg bg-muted/50">
                                <p className="text-sm text-muted-foreground">
                                    No hay recibo adjunto para este gasto
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

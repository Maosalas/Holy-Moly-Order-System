import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Phone, Package, DollarSign, CreditCard } from "lucide-react";
import { Expense } from "@/types/expense";

interface ExpensePreviewDialogProps {
    expense: Expense;
    setExpandedPhoto: (photo: string | null) => void;
}

export const ExpensePreviewDialog = ({ expense, setExpandedPhoto }: ExpensePreviewDialogProps) => {
    const deliveryDate = new Date(expense.purchaseDate);

    return (
        <Dialog>
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
                                <span className="font-semibold">{expense.cardType.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Client Photos */}
                    {expense.receiptUrl && (
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm text-muted-foreground">Fotos de referencia</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {Array.isArray(expense.receiptUrl)
                                    ? expense.receiptUrl.map((photo, index) => (
                                        <img
                                            key={index}
                                            src={photo}
                                            alt={`Client photo ${index + 1}`}
                                            className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                                            onClick={() => setExpandedPhoto(photo)}
                                        />
                                    ))
                                    : (
                                        <img
                                            src={expense.receiptUrl}
                                            alt="Client photo"
                                            className="w-full h-48 object-cover rounded-lg border cursor-pointer"
                                            onClick={() => setExpandedPhoto(expense.receiptUrl)}
                                        />
                                    )
                                }
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Calendar, Phone, Package, DollarSign, CreditCard } from "lucide-react";
import { Expense } from "@/types/expense";

interface ExpensePreviewDialogProps {
    expense: Expense;
}

export const ExpensePreviewDialog = ({ expense }: ExpensePreviewDialogProps) => {
    const deliveryDate = new Date(expense.purchaseDate);
    //   const remainingBalance = order.chargeAmount - order.downPayment;

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
                                            className="w-full h-48 object-cover rounded-lg border"
                                        />
                                    ))
                                    : (
                                        <img
                                            src={expense.receiptUrl}
                                            alt="Client photo"
                                            className="w-full h-48 object-cover rounded-lg border"
                                        />
                                    )
                                }
                            </div>
                        </div>
                    )}

                    {/* Client Information */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm text-muted-foreground">Información del cliente</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Nombre</p>
                                <p className="font-semibold">{expense.supermarketName}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Numero de teléfono</p>
                                </div>
                                <p className="font-semibold">{expense.supermarketName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">Detalles de Orden</h3>
                        <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg">
                            {expense.supermarketName}
                        </p>
                    </div>


                    {/* Delivery Information */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">Información de Entrega</h3>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">{deliveryDate.toLocaleDateString('es-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>
                    </div>

                    {/* Order Status */}
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">Status de Orden</h3>
                        <div className="flex flex-wrap gap-2">

                            <Badge key={expense.cardType}> {expense.cardType}
                            </Badge>

                        </div>
                    </div>


                </div>
            </DialogContent>
        </Dialog>
    );
};

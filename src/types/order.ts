export type OrderStatus = 
  | "waiting-for-payment"
  | "partially-paid"
  | "payment-received"
  | "confirmed"
  | "finished";

export type PaymentMethod = "Efectivo" | "Transferencia" | "Link de pago/tarjeta" | "SINPE";

export interface OrderStatusObject {
  id: string;
  status: OrderStatus;
  createdAt: string;
}

export interface Order {
  id: string;
  quotationId?: string;
  quotation?: {
    id: string;
    clientName: string;
    size: string;
    servings: number;
    totalCost: number;
    createdAt: string;
  };
  clientName: string;
  phoneNumber: string;
  orderDetails: string;
  deliveryDate: Date;
  clientPhotos: string[];
  needsCakeTopper: boolean;
  costAmount: number;
  chargeAmount: number;
  paymentMethod: PaymentMethod;
  downPayment: number;
  suppliesNeeded: string;
  statuses: (OrderStatus | OrderStatusObject)[];
  createdAt: string;
}

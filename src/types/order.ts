export type OrderStatus = 
  | "waiting_for_payment"
  | "partially_paid"
  | "payment_received"
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

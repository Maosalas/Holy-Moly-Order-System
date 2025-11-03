export type OrderStatus =
  | "waiting_for_payment"
  | "partially_paid"
  | "payment_received"
  | "confirmed"
  | "finished";

export type PaymentMethodName = "Efectivo" | "Transferencia" | "Link de pago/tarjeta" | "SINPE";

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
}

export interface OrderStatusObject {
  id: string;
  status: OrderStatus;
  createdAt: string;
}

export interface ClientPhoto {
  id: string;
  photoUrl: string;
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
  clientPhotos: (string | ClientPhoto)[]; // Can be strings when creating, objects when fetched
  needsCakeTopper: boolean;
  topperDetails?: string;
  topperPhotos?: string[];
  costAmount: number;
  chargeAmount: number;
  paymentMethod: PaymentMethod;
  downPayment: number;
  suppliesNeeded: string;
  statuses: (OrderStatus | OrderStatusObject)[];
  createdAt: string;
}

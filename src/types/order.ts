export type OrderStatus = 
  | "waiting-for-payment"
  | "partially-paid"
  | "payment-received"
  | "confirmed"
  | "finished";

export type PaymentMethod = "cash" | "transfer" | "card" | "other";

export interface Order {
  id: string;
  clientName: string;
  phoneNumber: string;
  orderDetails: string;
  deliveryDate: string;
  clientPhotos: string[];
  needsCakeTopper: boolean;
  costAmount: number;
  chargeAmount: number;
  paymentMethod: PaymentMethod;
  downPayment: number;
  suppliesNeeded: string;
  statuses: OrderStatus[];
  createdAt: string;
}

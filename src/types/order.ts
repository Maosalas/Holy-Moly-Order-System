export type OrderStatus = 
  | "waiting-for-payment"
  | "partially-paid"
  | "payment-received"
  | "confirmed"
  | "finished";

export type PaymentMethod = "Efectivo" | "Transferencia" | "Link de pago/tarjeta" | "SINPE";

export interface OrderSupply {
  supplyId: string;
  supplyName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface Order {
  id: string;
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
  selectedSupplies: OrderSupply[];
  suppliesNeeded: string;
  statuses: OrderStatus[];
  createdAt: string;
}

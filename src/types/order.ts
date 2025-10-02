export interface Order {
  id: string;
  clientName: string;
  phoneNumber: string;
  orderDetails: string;
  deliveryDate: string;
  clientPhotos: string[];
  needsCakeTopper: boolean;
  createdAt: string;
}

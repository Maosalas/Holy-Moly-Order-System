export interface Supply {
  id: string;
  organizationId: string;
  userId?: string;
  name: string;
  supplierName: string;
  quantity: number;
  unit: string;
  cost: number;
  photoUrl?: string | null;
  createdAt: string;
}

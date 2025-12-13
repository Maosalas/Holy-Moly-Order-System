export interface InventoryItem {
  id: string;
  organizationId: string;
  ingredientId?: string;
  supplyId?: string;
  itemType: 'ingredient' | 'supply';
  itemName: string;
  currentStock: number;
  unit: string;
  minStockThreshold: number;
  isLowStock: boolean;
  lastRestockDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryAlert {
  id: string;
  organizationId: string;
  inventoryItemId: string;
  itemName: string;
  currentStock: number;
  minStockThreshold: number;
  unit: string;
  alertType: 'low_stock' | 'out_of_stock';
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface InventoryPurchase {
  id: string;
  organizationId: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  cost: number;
  expenseId?: string;
  expenseName?: string;
  supplierName?: string;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryMovement {
  id: string;
  organizationId: string;
  inventoryItemId: string;
  itemName: string;
  movementType: 'deduction' | 'restock' | 'adjustment';
  quantity: number;
  unit: string;
  previousStock: number;
  newStock: number;
  referenceType?: 'order' | 'purchase' | 'manual';
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

export type InventoryItemFormData = {
  ingredientId?: string;
  supplyId?: string;
  itemType: 'ingredient' | 'supply';
  currentStock: number;
  minStockThreshold: number;
};

export type InventoryPurchaseFormData = Omit<InventoryPurchase, 'id' | 'organizationId' | 'itemName' | 'createdAt'>;

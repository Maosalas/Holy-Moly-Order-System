export interface CardType {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  organizationId: string;
  userId?: string;
  supermarketName: string;
  purchaseDate: string;
  amount: number;
  cardType: CardType;
  receiptUrl?: string;
  createdAt: string;
}

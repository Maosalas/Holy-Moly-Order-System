export interface CardType {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  supermarketName: string;
  purchaseDate: string;
  amount: number;
  cardType: CardType;
  receiptUrl?: string;
  createdAt: string;
}

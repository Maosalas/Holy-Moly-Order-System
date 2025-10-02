export type CardType = "amex" | "visa" | "other";

export interface Expense {
  id: string;
  supermarketName: string;
  purchaseDate: string;
  amount: number;
  cardType: CardType;
  receiptUrl?: string;
  createdAt: string;
}

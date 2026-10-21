export interface CreditCardResponse {
  creditCardId: number;
  bankName: string;
  cardName: string;
  cardNumberMasked: string | null;
  billingDay: number | null;
  paymentDueDay: number | null;
  creditLimit: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreditCardRequest {
  bankName: string;
  cardName: string;
  cardNumberMasked: string | null;
  billingDay: number | null;
  paymentDueDay: number | null;
  creditLimit: number | null;
}

export interface UpdateCreditCardRequest extends CreditCardRequest {
  isActive: boolean;
}

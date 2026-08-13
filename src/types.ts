export type EntityType = 'Fornecedor' | 'Funcionário';

export type PaymentType = 'Adiantamento' | 'Pagamento';

export type DocumentType = 'Boleto' | 'Nota Fiscal' | 'Adiantamento' | 'Pagamento' | 'Outros';

export type EntryStatus = 'Atrasado' | 'À Vencer' | 'Pago';

export interface Supplier {
  id: number;
  name: string;
}

export interface Employee {
  id: number;
  name: string;
  paymentType: PaymentType;
}

export interface Entry {
  id: number;
  favorecidoId: string; // e.g. "forn-1" or "func-2"
  favorecidoName: string;
  favorecidoType: EntityType;
  docType: DocumentType;
  nfNumber?: string;
  dueDate: string; // YYYY-MM-DD
  value: number;
  paymentDate?: string; // YYYY-MM-DD
  interestRate: number; // e.g. 2.5 (%)
}

export interface CalculatedEntry extends Entry {
  status: EntryStatus;
  daysOverdue: number;
  interestValue: number;
  totalWithInterest: number;
  monthYear: string; // e.g. "8/2026"
}

export interface EntitySummary {
  name: string;
  type: EntityType;
  countPaid: number;
  valuePaid: number;
  countOverdue: number;
  valueOverdue: number;
  countToPay: number;
  valueToPay: number;
  balanceDue: number; // Saldo Devedor
  accumulatedInterest: number; // Juros Acumulados
}

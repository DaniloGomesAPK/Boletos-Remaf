import { Entry, CalculatedEntry, EntryStatus, EntitySummary, Supplier, Employee } from '../types';

/**
 * Normalizes a date string (YYYY-MM-DD) to Midnight UTC or Midnight local for date comparison
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseBRDate(dateStr: string): string {
  if (!dateStr) return '';
  // Convert YYYY-MM-DD to DD/MM/YYYY
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export const MONTHS_PT = [
  { value: 1, label: 'Janeiro', short: 'Jan' },
  { value: 2, label: 'Fevereiro', short: 'Fev' },
  { value: 3, label: 'Março', short: 'Mar' },
  { value: 4, label: 'Abril', short: 'Abr' },
  { value: 5, label: 'Maio', short: 'Mai' },
  { value: 6, label: 'Junho', short: 'Jun' },
  { value: 7, label: 'Julho', short: 'Jul' },
  { value: 8, label: 'Agosto', short: 'Ago' },
  { value: 9, label: 'Setembro', short: 'Set' },
  { value: 10, label: 'Outubro', short: 'Out' },
  { value: 11, label: 'Novembro', short: 'Nov' },
  { value: 12, label: 'Dezembro', short: 'Dez' },
];

export function getMonthYearFromDateStr(dateStr: string): { month: number; year: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (!isNaN(year) && !isNaN(month)) {
      return { month, year };
    }
  }
  return null;
}

export function calculateEntryDetails(entry: Entry, todayStr: string = getTodayDateString()): CalculatedEntry {
  const dueDate = new Date(entry.dueDate + 'T00:00:00');
  const todayDate = new Date(todayStr + 'T00:00:00');

  const isPaid = Boolean(entry.paymentDate && entry.paymentDate.trim() !== '');

  let status: EntryStatus = 'À Vencer';
  let daysOverdue = 0;

  if (isPaid) {
    status = 'Pago';
    daysOverdue = 0;
  } else if (dueDate < todayDate) {
    status = 'Atrasado';
    const diffTime = todayDate.getTime() - dueDate.getTime();
    daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  } else {
    status = 'À Vencer';
    daysOverdue = 0;
  }

  // Interest calculation
  // "Se Tipo Documento = 'Adiantamento' OU 'Pagamento': Juros = 0 (sem juros para pessoal)"
  let interestValue = 0;
  const isPersonnelDoc = entry.docType === 'Adiantamento' || entry.docType === 'Pagamento' || entry.favorecidoType === 'Funcionário';

  if (!isPersonnelDoc && status === 'Atrasado' && entry.interestRate > 0 && daysOverdue > 0) {
    interestValue = entry.value * (entry.interestRate / 100) * (daysOverdue / 30);
  }

  // Round interest to 2 decimals
  interestValue = Math.round(interestValue * 100) / 100;

  const totalWithInterest = Math.round((entry.value + interestValue) * 100) / 100;

  // Month / Year calculation based on Vencimento
  const month = dueDate.getMonth() + 1;
  const year = dueDate.getFullYear();
  const monthYear = `${month}/${year}`;

  return {
    ...entry,
    status,
    daysOverdue,
    interestValue,
    totalWithInterest,
    monthYear,
  };
}

export function calculateSummaries(
  entries: CalculatedEntry[],
  suppliers: Supplier[],
  employees: Employee[]
): EntitySummary[] {
  const summaries: EntitySummary[] = [];

  // Suppliers summaries
  suppliers.forEach((s) => {
    const sEntries = entries.filter((e) => e.favorecidoName === s.name && e.favorecidoType === 'Fornecedor');
    
    let countPaid = 0, valuePaid = 0;
    let countOverdue = 0, valueOverdue = 0;
    let countToPay = 0, valueToPay = 0;
    let accumulatedInterest = 0;

    sEntries.forEach((e) => {
      accumulatedInterest += e.interestValue;
      if (e.status === 'Pago') {
        countPaid++;
        valuePaid += e.totalWithInterest;
      } else if (e.status === 'Atrasado') {
        countOverdue++;
        valueOverdue += e.totalWithInterest;
      } else {
        countToPay++;
        valueToPay += e.totalWithInterest;
      }
    });

    const balanceDue = valueOverdue + valueToPay;

    summaries.push({
      name: s.name,
      type: 'Fornecedor',
      countPaid,
      valuePaid,
      countOverdue,
      valueOverdue,
      countToPay,
      valueToPay,
      balanceDue,
      accumulatedInterest,
    });
  });

  // Employees summaries
  employees.forEach((emp) => {
    const eEntries = entries.filter((e) => e.favorecidoName === emp.name && e.favorecidoType === 'Funcionário');

    let countPaid = 0, valuePaid = 0;
    let countOverdue = 0, valueOverdue = 0;
    let countToPay = 0, valueToPay = 0;
    let accumulatedInterest = 0;

    eEntries.forEach((e) => {
      accumulatedInterest += e.interestValue;
      if (e.status === 'Pago') {
        countPaid++;
        valuePaid += e.totalWithInterest;
      } else if (e.status === 'Atrasado') {
        countOverdue++;
        valueOverdue += e.totalWithInterest;
      } else {
        countToPay++;
        valueToPay += e.totalWithInterest;
      }
    });

    const balanceDue = valueOverdue + valueToPay;

    summaries.push({
      name: emp.name,
      type: 'Funcionário',
      countPaid,
      valuePaid,
      countOverdue,
      valueOverdue,
      countToPay,
      valueToPay,
      balanceDue,
      accumulatedInterest,
    });
  });

  return summaries;
}

export function exportToCSV(entries: CalculatedEntry[]): void {
  const headers = [
    'ID',
    'Favorecido',
    'Tipo Favorecido',
    'Tipo Documento',
    'Número NF',
    'Vencimento',
    'Valor (R$)',
    'Data Pagamento',
    'Status',
    'Taxa Juros (%)',
    'Dias Atrasados',
    'Juros (R$)',
    'Total com Juros (R$)',
    'Mês/Ano'
  ];

  const rows = entries.map((e) => [
    e.id,
    `"${e.favorecidoName.replace(/"/g, '""')}"`,
    e.favorecidoType,
    e.docType,
    e.nfNumber || '-',
    parseBRDate(e.dueDate),
    e.value.toFixed(2).replace('.', ','),
    e.paymentDate ? parseBRDate(e.paymentDate) : '-',
    e.status,
    e.interestRate,
    e.daysOverdue,
    e.interestValue.toFixed(2).replace('.', ','),
    e.totalWithInterest.toFixed(2).replace('.', ','),
    e.monthYear
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `contas_a_pagar_${getTodayDateString()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

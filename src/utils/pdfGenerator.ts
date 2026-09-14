import { jsPDF } from 'jspdf';
import { CalculatedEntry } from '../types';
import { formatBRL, parseBRDate } from './calculations';

export interface SupplierPDFReportData {
  supplierName: string;
  periodLabel: string;
  totalPurchased: number;
  totalPaid: number;
  totalPending: number;
  pendingEntries: CalculatedEntry[];
  paidEntries: CalculatedEntry[];
  monthlyHistory: { monthLabel: string; paid: number; total: number }[];
}

export function generateSupplierPDFReport(data: SupplierPDFReportData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 16;

  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const accentBlue: [number, number, number] = [37, 99, 235]; // blue-600
  const textDark: [number, number, number] = [15, 23, 42]; // slate-900
  const textMuted: [number, number, number] = [100, 116, 139]; // slate-500
  const greenColor: [number, number, number] = [5, 150, 105]; // emerald-600
  const redColor: [number, number, number] = [225, 29, 72]; // rose-600

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 16) {
      doc.addPage();
      currentY = 16;
      drawHeaderSmall();
    }
  };

  const drawHeaderSmall = () => {
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text(`Relatório Financeiro do Fornecedor - ${data.supplierName}`, margin, 10);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 12, pageWidth - margin, 12);
  };

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATÓRIO FINANCEIRO DO FORNECEDOR', margin + 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Fornecedor: ${data.supplierName}`, margin + 6, currentY + 16);

  const issueDateStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Período: ${data.periodLabel}  |  Emissão: ${issueDateStr}`, margin + 6, currentY + 21);

  currentY += 28;

  // Resumo Financeiro (Cards)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...textDark);
  doc.text('RESUMO FINANCEIRO', margin, currentY);
  currentY += 4;

  const cardWidth = (contentWidth - 6) / 3;
  const cardHeight = 18;

  // Card 1: Total Lançado
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textMuted);
  doc.text('TOTAL LANÇADO', margin + 4, currentY + 5.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(formatBRL(data.totalPurchased), margin + 4, currentY + 13);

  // Card 2: Total Pago
  const card2X = margin + cardWidth + 3;
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(card2X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...greenColor);
  doc.text('TOTAL PAGO', card2X + 4, currentY + 5.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatBRL(data.totalPaid), card2X + 4, currentY + 13);

  // Card 3: Saldo Pendente
  const card3X = margin + (cardWidth + 3) * 2;
  doc.setFillColor(255, 241, 242); // rose-50
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(card3X, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...redColor);
  doc.text('SALDO PENDENTE', card3X + 4, currentY + 5.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(formatBRL(data.totalPending), card3X + 4, currentY + 13);

  currentY += cardHeight + 6;

  // Helper to draw a table
  const drawTableHeader = (title: string, columns: { name: string; width: number; align?: 'left' | 'right' | 'center' }[], badgeColor: [number, number, number]) => {
    checkPageBreak(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...textDark);
    doc.text(title, margin, currentY);
    currentY += 4;

    doc.setFillColor(...badgeColor);
    doc.rect(margin, currentY, contentWidth, 6, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    let curX = margin + 3;
    columns.forEach((col) => {
      if (col.align === 'right') {
        doc.text(col.name, curX + col.width - 6, currentY + 4.2, { align: 'right' });
      } else if (col.align === 'center') {
        doc.text(col.name, curX + col.width / 2, currentY + 4.2, { align: 'center' });
      } else {
        doc.text(col.name, curX, currentY + 4.2);
      }
      curX += col.width;
    });

    currentY += 6;
  };

  // Section 1: Contas Pendentes
  const pendingCols = [
    { name: 'Documento / NF', width: 44, align: 'left' as const },
    { name: 'Tipo', width: 28, align: 'left' as const },
    { name: 'Vencimento', width: 26, align: 'center' as const },
    { name: 'Status', width: 26, align: 'center' as const },
    { name: 'Juros', width: 24, align: 'right' as const },
    { name: 'Valor Total', width: 34, align: 'right' as const },
  ];

  drawTableHeader(
    `CONTAS PENDENTES (${data.pendingEntries.length}) - Total: ${formatBRL(data.totalPending)}`,
    pendingCols,
    [225, 29, 72] // rose-600
  );

  if (data.pendingEntries.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Nenhuma conta pendente encontrada para este fornecedor no período.', margin + 4, currentY + 5.5);
    currentY += 11;
  } else {
    data.pendingEntries.forEach((entry, idx) => {
      checkPageBreak(7);
      const isOdd = idx % 2 === 1;
      if (isOdd) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);

      let curX = margin + 3;

      // Documento / NF
      const docLabel = entry.nfNumber ? `NF ${entry.nfNumber}` : `Doc #${entry.id}`;
      doc.text(docLabel, curX, currentY + 4.2);
      curX += pendingCols[0].width;

      // Tipo
      doc.text(entry.docType || 'Boleto', curX, currentY + 4.2);
      curX += pendingCols[1].width;

      // Vencimento
      doc.text(parseBRDate(entry.dueDate), curX + pendingCols[2].width / 2, currentY + 4.2, { align: 'center' });
      curX += pendingCols[2].width;

      // Status
      const isAtrasado = entry.status === 'Atrasado';
      doc.setFont('helvetica', 'bold');
      if (isAtrasado) {
        doc.setTextColor(...redColor);
        doc.text(`Atrasado (${entry.daysOverdue}d)`, curX + pendingCols[3].width / 2, currentY + 4.2, { align: 'center' });
      } else {
        doc.setTextColor(37, 99, 235);
        doc.text('A Vencer', curX + pendingCols[3].width / 2, currentY + 4.2, { align: 'center' });
      }
      curX += pendingCols[3].width;

      // Juros
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textDark);
      const jurosStr = entry.interestValue > 0 ? formatBRL(entry.interestValue) : 'R$ 0,00';
      doc.text(jurosStr, curX + pendingCols[4].width - 6, currentY + 4.2, { align: 'right' });
      curX += pendingCols[4].width;

      // Valor Total
      doc.setFont('helvetica', 'bold');
      doc.text(formatBRL(entry.totalWithInterest || entry.value), curX + pendingCols[5].width - 6, currentY + 4.2, { align: 'right' });

      currentY += 6;
    });

    // Subtotal Pendente row
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 1.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...redColor);
    doc.text('Subtotal Pendente:', margin + contentWidth - 60, currentY + 4);
    doc.text(formatBRL(data.totalPending), margin + contentWidth - 3, currentY + 4, { align: 'right' });
    currentY += 8;
  }

  // Section 2: Contas Pagas
  const paidCols = [
    { name: 'Documento / NF', width: 50, align: 'left' as const },
    { name: 'Tipo', width: 32, align: 'left' as const },
    { name: 'Vencimento', width: 32, align: 'center' as const },
    { name: 'Data Pagamento', width: 34, align: 'center' as const },
    { name: 'Valor Pago', width: 34, align: 'right' as const },
  ];

  drawTableHeader(
    `CONTAS PAGAS (${data.paidEntries.length}) - Total: ${formatBRL(data.totalPaid)}`,
    paidCols,
    [5, 150, 105] // emerald-600
  );

  if (data.paidEntries.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...textMuted);
    doc.text('Nenhuma conta paga registrada para este fornecedor no período.', margin + 4, currentY + 5.5);
    currentY += 11;
  } else {
    data.paidEntries.forEach((entry, idx) => {
      checkPageBreak(7);
      const isOdd = idx % 2 === 1;
      if (isOdd) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);

      let curX = margin + 3;

      // Documento / NF
      const docLabel = entry.nfNumber ? `NF ${entry.nfNumber}` : `Doc #${entry.id}`;
      doc.text(docLabel, curX, currentY + 4.2);
      curX += paidCols[0].width;

      // Tipo
      doc.text(entry.docType || 'Boleto', curX, currentY + 4.2);
      curX += paidCols[1].width;

      // Vencimento
      doc.text(parseBRDate(entry.dueDate), curX + paidCols[2].width / 2, currentY + 4.2, { align: 'center' });
      curX += paidCols[2].width;

      // Data Pagamento
      const payDate = entry.paymentDate ? parseBRDate(entry.paymentDate) : '-';
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenColor);
      doc.text(payDate, curX + paidCols[3].width / 2, currentY + 4.2, { align: 'center' });
      curX += paidCols[3].width;

      // Valor Pago
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textDark);
      doc.text(formatBRL(entry.totalWithInterest || entry.value), curX + paidCols[4].width - 6, currentY + 4.2, { align: 'right' });

      currentY += 6;
    });

    // Subtotal Pago row
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 1.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...greenColor);
    doc.text('Subtotal Pago:', margin + contentWidth - 60, currentY + 4);
    doc.text(formatBRL(data.totalPaid), margin + contentWidth - 3, currentY + 4, { align: 'right' });
    currentY += 8;
  }

  // Section 3: Histórico Financeiro por Mês
  if (data.monthlyHistory.length > 0) {
    const historyCols = [
      { name: 'Mês / Período', width: 60, align: 'left' as const },
      { name: 'Total Pago no Mês', width: 61, align: 'right' as const },
      { name: 'Volume Total (Lançado)', width: 61, align: 'right' as const },
    ];

    drawTableHeader('HISTÓRICO FINANCEIRO (EVOLUÇÃO POR MÊS)', historyCols, accentBlue);

    data.monthlyHistory.forEach((item, idx) => {
      checkPageBreak(7);
      const isOdd = idx % 2 === 1;
      if (isOdd) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, contentWidth, 6, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...textDark);

      let curX = margin + 3;
      doc.text(item.monthLabel, curX, currentY + 4.2);
      curX += historyCols[0].width;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...greenColor);
      doc.text(formatBRL(item.paid), curX + historyCols[1].width - 6, currentY + 4.2, { align: 'right' });
      curX += historyCols[1].width;

      doc.setTextColor(...textDark);
      doc.text(formatBRL(item.total), curX + historyCols[2].width - 6, currentY + 4.2, { align: 'right' });

      currentY += 6;
    });

    currentY += 6;
  }

  // Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.text(
      `Sistema de Contas a Pagar  |  Fornecedor: ${data.supplierName}  |  Emitido em: ${issueDateStr}`,
      margin,
      pageHeight - 6.5
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
  }

  // Trigger download in browser
  const sanitizedName = data.supplierName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  doc.save(`relatorio_fornecedor_${sanitizedName}.pdf`);
}

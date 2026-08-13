import React, { useState } from 'react';
import { Entry, CalculatedEntry, Supplier, Employee, DocumentType, EntryStatus } from '../types';
import { parseBRDate, formatBRL, getTodayDateString } from '../utils/calculations';
import { PlusCircle, Search, Edit2, Trash2, CheckCircle2, Clock, AlertCircle, XCircle, Filter, ArrowUpDown } from 'lucide-react';
import { EditEntryModal } from './EditEntryModal';

interface EntriesViewProps {
  entries: CalculatedEntry[];
  suppliers: Supplier[];
  employees: Employee[];
  onAddEntry: (newEntry: Omit<Entry, 'id'>) => void;
  onUpdateEntry: (updatedEntry: CalculatedEntry) => void;
  onDeleteEntry: (id: number) => void;
  onQuickTogglePaid: (id: number) => void;
}

export const EntriesView: React.FC<EntriesViewProps> = ({
  entries,
  suppliers,
  employees,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onQuickTogglePaid,
}) => {
  // Form State
  const [favorecidoSelect, setFavorecidoSelect] = useState<string>('');
  const [docType, setDocType] = useState<DocumentType>('Boleto');
  const [nfNumber, setNfNumber] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [value, setValue] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [interestRate, setInterestRate] = useState('2.5');

  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<'Todos' | EntryStatus>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'status' | 'dueDate' | 'value' | 'favorecidoName'>('status');
  const [sortAsc, setSortAsc] = useState(true);

  // Edit Modal State
  const [editingEntry, setEditingEntry] = useState<CalculatedEntry | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!favorecidoSelect) {
      alert('Por favor, selecione um favorecido (Fornecedor ou Funcionário).');
      return;
    }
    if (!dueDate) {
      alert('Por favor, informe a data de vencimento.');
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      alert('Por favor, informe um valor válido e maior que zero.');
      return;
    }

    const numInterest = parseFloat(interestRate) || 0;

    // Identify Favorecido details
    let favorecidoName = '';
    let favorecidoType: 'Fornecedor' | 'Funcionário' = 'Fornecedor';

    if (favorecidoSelect.startsWith('forn-')) {
      const id = parseInt(favorecidoSelect.replace('forn-', ''));
      const sup = suppliers.find((s) => s.id === id);
      if (sup) {
        favorecidoName = sup.name;
        favorecidoType = 'Fornecedor';
      }
    } else if (favorecidoSelect.startsWith('func-')) {
      const id = parseInt(favorecidoSelect.replace('func-', ''));
      const emp = employees.find((e) => e.id === id);
      if (emp) {
        favorecidoName = emp.name;
        favorecidoType = 'Funcionário';
      }
    }

    onAddEntry({
      favorecidoId: favorecidoSelect,
      favorecidoName,
      favorecidoType,
      docType,
      nfNumber: nfNumber.trim(),
      dueDate,
      value: numValue,
      paymentDate: paymentDate.trim(),
      interestRate: numInterest,
    });

    // Reset Form
    setNfNumber('');
    setValue('');
    setPaymentDate('');
  };

  // Filter & Sort Entries
  const filteredEntries = entries.filter((e) => {
    if (statusFilter !== 'Todos' && e.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = e.favorecidoName.toLowerCase().includes(q);
      const matchNf = e.nfNumber ? e.nfNumber.toLowerCase().includes(q) : false;
      const matchDoc = e.docType.toLowerCase().includes(q);
      return matchName || matchNf || matchDoc;
    }
    return true;
  });

  // Default Order by Status: Atrasado -> À Vencer -> Pago
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    if (sortField === 'status') {
      const orderMap: Record<EntryStatus, number> = {
        Atrasado: 1,
        'À Vencer': 2,
        Pago: 3,
      };
      const orderA = orderMap[a.status];
      const orderB = orderMap[b.status];
      return sortAsc ? orderA - orderB : orderB - orderA;
    } else if (sortField === 'dueDate') {
      return sortAsc
        ? a.dueDate.localeCompare(b.dueDate)
        : b.dueDate.localeCompare(a.dueDate);
    } else if (sortField === 'value') {
      return sortAsc ? a.totalWithInterest - b.totalWithInterest : b.totalWithInterest - a.totalWithInterest;
    } else if (sortField === 'favorecidoName') {
      return sortAsc
        ? a.favorecidoName.localeCompare(b.favorecidoName)
        : b.favorecidoName.localeCompare(a.favorecidoName);
    }
    return 0;
  });

  const handleHeaderSort = (field: 'status' | 'dueDate' | 'value' | 'favorecidoName') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Form Section (High Density) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs p-3 sm:p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <PlusCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Novo Lançamento
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Favorecido */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Favorecido <span className="text-rose-500">*</span>
              </label>
              <select
                value={favorecidoSelect}
                onChange={(e) => setFavorecidoSelect(e.target.value)}
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
                required
              >
                <option value="">-- Selecione o Favorecido --</option>
                <optgroup label="Fornecedores">
                  {suppliers.map((s) => (
                    <option key={`forn-${s.id}`} value={`forn-${s.id}`}>
                      [F] {s.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Funcionários">
                  {employees.map((emp) => (
                    <option key={`func-${emp.id}`} value={`func-${emp.id}`}>
                      [Func] {emp.name} ({emp.paymentType})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Tipo Documento */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Tipo Documento
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
              >
                <option value="Boleto">Boleto</option>
                <option value="Nota Fiscal">Nota Fiscal</option>
                <option value="Adiantamento">Adiantamento</option>
                <option value="Pagamento">Pagamento</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            {/* Número NF */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Número NF (opcional)
              </label>
              <input
                type="text"
                value={nfNumber}
                onChange={(e) => setNfNumber(e.target.value)}
                placeholder="Ex: 1001"
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
              />
            </div>

            {/* Data Vencimento */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Data Vencimento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
                required
              />
            </div>

            {/* Valor */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Valor (R$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
                required
              />
            </div>

            {/* Data Pagamento */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Data Pagamento (opcional)
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
              />
            </div>

            {/* Taxa de Juros (%) */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Taxa Juros (%) Mensal
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="2.5"
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded shadow-2xs transition-all h-7.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Adicionar Lançamento</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Table Section (High Density) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden">
        {/* Table Filters Header */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1 uppercase tracking-wider">
              <Filter className="w-3 h-3" />
              Status:
            </span>

            <button
              onClick={() => setStatusFilter('Todos')}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                statusFilter === 'Todos'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300'
              }`}
            >
              Todos ({entries.length})
            </button>

            <button
              onClick={() => setStatusFilter('Atrasado')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold transition-all ${
                statusFilter === 'Atrasado'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 hover:bg-rose-200'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              Atrasado ({entries.filter((e) => e.status === 'Atrasado').length})
            </button>

            <button
              onClick={() => setStatusFilter('À Vencer')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold transition-all ${
                statusFilter === 'À Vencer'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 hover:bg-blue-200'
              }`}
            >
              <Clock className="w-3 h-3" />
              À Vencer ({entries.filter((e) => e.status === 'À Vencer').length})
            </button>

            <button
              onClick={() => setStatusFilter('Pago')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold transition-all ${
                statusFilter === 'Pago'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Pago ({entries.filter((e) => e.status === 'Pago').length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar favorecido ou NF..."
              className="w-full pl-7 pr-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7"
            />
          </div>
        </div>

        {/* Dynamic Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 select-none text-[11px]">
                <th className="py-2 px-2.5 w-8 text-center font-mono">ID</th>
                <th
                  onClick={() => handleHeaderSort('favorecidoName')}
                  className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center gap-1">
                    <span>Favorecido</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2">Tipo Doc</th>
                <th className="py-2 px-2 font-mono">NF</th>
                <th
                  onClick={() => handleHeaderSort('dueDate')}
                  className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center gap-1">
                    <span>Vencimento</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2.5 text-right font-mono">Valor</th>
                <th className="py-2 px-2">Data Pagto</th>
                <th
                  onClick={() => handleHeaderSort('status')}
                  className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2 text-center">Juros %</th>
                <th className="py-2 px-2 text-center">Dias Atraso</th>
                <th className="py-2 px-2.5 text-right font-mono">Juros (R$)</th>
                <th
                  onClick={() => handleHeaderSort('value')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-extrabold font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Total c/ Juros</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2 text-center">Mês/Ano</th>
                <th className="py-2 px-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-[11px] tabular-nums font-mono">
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-slate-500 dark:text-slate-400 font-sans">
                    Nenhum lançamento encontrado.
                  </td>
                </tr>
              ) : (
                sortedEntries.map((entry) => {
                  let statusBadgeClass = '';
                  let statusText = entry.status;

                  if (entry.status === 'Pago') {
                    statusBadgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
                  } else if (entry.status === 'Atrasado') {
                    statusBadgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800';
                  } else {
                    statusBadgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800';
                  }

                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* ID */}
                      <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono text-[10px]">
                        #{entry.id}
                      </td>

                      {/* Favorecido */}
                      <td className="py-1.5 px-2.5 font-sans font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{entry.favorecidoName}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            {entry.favorecidoType}
                          </span>
                        </div>
                      </td>

                      {/* Tipo Doc */}
                      <td className="py-1.5 px-2 font-sans text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {entry.docType}
                      </td>

                      {/* NF */}
                      <td className="py-1.5 px-2 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {entry.nfNumber || '-'}
                      </td>

                      {/* Vencimento */}
                      <td className="py-1.5 px-2.5 text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {parseBRDate(entry.dueDate)}
                      </td>

                      {/* Valor Base */}
                      <td className="py-1.5 px-2.5 text-right font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatBRL(entry.value)}
                      </td>

                      {/* Data Pagto */}
                      <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {entry.paymentDate ? parseBRDate(entry.paymentDate) : '-'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-1.5 px-2.5 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.25 rounded text-[10px] font-bold ${statusBadgeClass}`}
                        >
                          {entry.status === 'Pago' && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          {entry.status === 'Atrasado' && <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                          {entry.status === 'À Vencer' && <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                          {statusText}
                        </span>
                      </td>

                      {/* Taxa Juros */}
                      <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {entry.interestRate > 0 ? `${entry.interestRate}%` : '-'}
                      </td>

                      {/* Dias Atrasados */}
                      <td
                        className={`py-1.5 px-2 text-center font-bold ${
                          entry.daysOverdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {entry.daysOverdue > 0 ? `${entry.daysOverdue}d` : '0'}
                      </td>

                      {/* Juros (R$) */}
                      <td className="py-1.5 px-2.5 text-right text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {entry.interestValue > 0 ? formatBRL(entry.interestValue) : 'R$ 0,00'}
                      </td>

                      {/* Total com Juros */}
                      <td className="py-1.5 px-2.5 text-right font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatBRL(entry.totalWithInterest)}
                      </td>

                      {/* Mês/Ano */}
                      <td className="py-1.5 px-2 text-center font-sans text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {entry.monthYear}
                      </td>

                      {/* Ações */}
                      <td className="py-1.5 px-2.5 text-center font-sans whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick Paid Toggle Button */}
                          <button
                            onClick={() => onQuickTogglePaid(entry.id)}
                            className={`p-1 rounded transition-colors ${
                              entry.status === 'Pago'
                                ? 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-950'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={entry.status === 'Pago' ? 'Desmarcar Pagamento' : 'Marcar como Pago Hoje'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="p-1 rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                            title="Editar Lançamento"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => onDeleteEntry(entry.id)}
                            className="p-1 rounded text-rose-600 hover:text-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Entry Modal */}
      <EditEntryModal
        isOpen={Boolean(editingEntry)}
        entry={editingEntry}
        suppliers={suppliers}
        employees={employees}
        onClose={() => setEditingEntry(null)}
        onSave={(updated) => {
          onUpdateEntry(updated);
          setEditingEntry(null);
        }}
      />
    </div>
  );
};

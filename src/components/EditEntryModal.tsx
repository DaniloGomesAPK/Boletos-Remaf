import React, { useState, useEffect } from 'react';
import { CalculatedEntry, DocumentType, Supplier, Employee } from '../types';
import { getTipoFavorecido, parseCurrencyInput } from '../utils/calculations';
import { X, Check } from 'lucide-react';

interface EditEntryModalProps {
  isOpen: boolean;
  entry: CalculatedEntry | null;
  suppliers: Supplier[];
  employees: Employee[];
  onClose: () => void;
  onSave: (updatedEntry: CalculatedEntry) => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  isOpen,
  entry,
  suppliers,
  employees,
  onClose,
  onSave,
}) => {
  if (!isOpen || !entry) return null;

  const [favorecidoSelect, setFavorecidoSelect] = useState(entry.favorecidoId);
  const [docType, setDocType] = useState<DocumentType>(entry.docType);
  const [nfNumber, setNfNumber] = useState(entry.nfNumber || '');
  const [dueDate, setDueDate] = useState(entry.dueDate);
  const [value, setValue] = useState(
    entry.value ? entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  );
  const [paymentDate, setPaymentDate] = useState(entry.paymentDate || '');
  const [interestRate, setInterestRate] = useState(entry.interestRate.toString());

  useEffect(() => {
    if (entry) {
      setFavorecidoSelect(entry.favorecidoId);
      setDocType(entry.docType);
      setNfNumber(entry.nfNumber || '');
      setDueDate(entry.dueDate);
      setValue(
        entry.value ? entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
      );
      setPaymentDate(entry.paymentDate || '');
      setInterestRate(entry.interestRate.toString());
    }
  }, [entry]);

  const handleValueBlur = () => {
    if (value.trim()) {
      const parsed = parseCurrencyInput(value);
      if (parsed > 0) {
        setValue(
          parsed.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numValue = parseCurrencyInput(value);
    const numInterestRate = parseCurrencyInput(interestRate) || 0;

    if (!favorecidoSelect) {
      alert('Selecione um favorecido.');
      return;
    }
    if (!dueDate) {
      alert('A data de vencimento é obrigatória.');
      return;
    }
    if (isNaN(numValue) || numValue <= 0) {
      alert('Informe um valor válido e maior que zero.');
      return;
    }

    // Determine favorecido details
    let favorecidoName = '';
    let favorecidoType: 'Fornecedor' | 'Funcionário' = 'Fornecedor';

    if (favorecidoSelect.startsWith('forn-')) {
      const id = parseInt(favorecidoSelect.replace('forn-', ''));
      const s = suppliers.find((sup) => sup.id === id);
      if (s) {
        favorecidoName = s.name;
        favorecidoType = getTipoFavorecido(s.name, employees, favorecidoSelect);
      }
    } else if (favorecidoSelect.startsWith('func-')) {
      const id = parseInt(favorecidoSelect.replace('func-', ''));
      const emp = employees.find((e) => e.id === id);
      if (emp) {
        favorecidoName = emp.name;
        favorecidoType = getTipoFavorecido(emp.name, employees, favorecidoSelect);
      }
    }

    const updated: CalculatedEntry = {
      ...entry,
      favorecidoId: favorecidoSelect,
      favorecidoName: favorecidoName || entry.favorecidoName,
      favorecidoType,
      docType,
      nfNumber,
      dueDate,
      value: numValue,
      paymentDate,
      interestRate: numInterestRate,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Editar Lançamento #{entry.id}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 text-xs">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Vencimento */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Vencimento <span className="text-rose-500">*</span>
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
                type="text"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={handleValueBlur}
                placeholder="Ex: 1.950,00 ou 1950"
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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

            {/* Taxa Juros */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                Taxa de Juros (%) (Mensal)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Ex: 2.5 ou 2,5"
                className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded shadow-2xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

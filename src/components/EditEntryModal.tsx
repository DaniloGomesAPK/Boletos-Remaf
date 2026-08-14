import React, { useState, useEffect } from 'react';
import { CalculatedEntry, DocumentType, Supplier, Employee } from '../types';
import { getTipoFavorecido, parseCurrencyInput, formatBRL } from '../utils/calculations';
import { X, Check, Trash2, AlertTriangle } from 'lucide-react';

interface EditEntryModalProps {
  isOpen: boolean;
  entry: CalculatedEntry | null;
  suppliers: Supplier[];
  employees: Employee[];
  onClose: () => void;
  onSave: (updatedEntry: CalculatedEntry) => void;
  onDelete?: (id: number) => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  isOpen,
  entry,
  suppliers,
  employees,
  onClose,
  onSave,
  onDelete,
}) => {
  if (!isOpen || !entry) return null;

  const [confirmDelete, setConfirmDelete] = useState(false);

  const getInitialFavorecidoSelect = (favId?: string, dType?: string) => {
    if (!favId) return '';
    if (favId.startsWith('func-')) {
      if (favId.endsWith('-pagamento') || favId.endsWith('-adiantamento')) {
        return favId;
      }
      return dType === 'Adiantamento' ? `${favId}-adiantamento` : `${favId}-pagamento`;
    }
    return favId;
  };

  const [favorecidoSelect, setFavorecidoSelect] = useState(() =>
    getInitialFavorecidoSelect(entry.favorecidoId, entry.docType)
  );
  const [docType, setDocType] = useState<DocumentType>(entry.docType);
  const [nfNumber, setNfNumber] = useState(entry.nfNumber || '');
  const [dueDate, setDueDate] = useState(entry.dueDate);
  const [value, setValue] = useState(
    entry.value ? entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
  );
  const [paymentDate, setPaymentDate] = useState(entry.paymentDate || '');
  const [interestRate, setInterestRate] = useState(entry.interestRate.toString());

  const sortedSuppliers = [...suppliers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  useEffect(() => {
    if (entry) {
      setFavorecidoSelect(getInitialFavorecidoSelect(entry.favorecidoId, entry.docType));
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

  const handleFavorecidoChange = (val: string) => {
    setFavorecidoSelect(val);
    if (val.endsWith('-pagamento')) {
      setDocType('Pagamento');
    } else if (val.endsWith('-adiantamento')) {
      setDocType('Adiantamento');
    }
  };

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
      const id = parseInt(favorecidoSelect.replace('forn-', ''), 10);
      const s = suppliers.find((sup) => sup.id === id);
      if (s) {
        favorecidoName = s.name;
        favorecidoType = getTipoFavorecido(s.name, employees, favorecidoSelect);
      }
    } else if (favorecidoSelect.startsWith('func-')) {
      const cleanIdStr = favorecidoSelect.replace('func-', '').replace('-pagamento', '').replace('-adiantamento', '');
      const id = parseInt(cleanIdStr, 10);
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
              onChange={(e) => handleFavorecidoChange(e.target.value)}
              className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
              required
            >
              <optgroup label="Fornecedores">
                {sortedSuppliers.map((s) => (
                  <option key={`forn-${s.id}`} value={`forn-${s.id}`}>
                    [F] {s.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Funcionários - Pagamentos">
                {sortedEmployees.map((emp) => (
                  <option key={`func-${emp.id}-pagamento`} value={`func-${emp.id}-pagamento`}>
                    [Func] {emp.name} - Pagamento
                  </option>
                ))}
              </optgroup>
              <optgroup label="Funcionários - Adiantamentos">
                {sortedEmployees.map((emp) => (
                  <option key={`func-${emp.id}-adiantamento`} value={`func-${emp.id}-adiantamento`}>
                    [Func] {emp.name} - Adiantamento
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

          {confirmDelete ? (
            <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Confirmar exclusão deste lançamento de {formatBRL(entry.value)}?</span>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-semibold text-[11px] rounded transition-colors"
                >
                  Não, voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onDelete) onDelete(entry.id);
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded shadow-2xs transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Sim, Excluir
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div>
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded text-xs font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Lançamento
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
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
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

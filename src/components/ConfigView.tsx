import React, { useState, useRef } from 'react';
import { Supplier, Employee, PaymentType } from '../types';
import { Truck, UserCheck, Plus, Edit2, Trash2, Check, X, Database, Download, Upload, FileCode2, RefreshCw, Moon, Sun } from 'lucide-react';
import { UserMenu } from './UserMenu';

interface ConfigViewProps {
  suppliers: Supplier[];
  employees: Employee[];
  onAddSupplier: (name: string) => void;
  onUpdateSupplier: (id: number, name: string) => void;
  onDeleteSupplier: (id: number) => void;
  onAddEmployee: (name: string, paymentType: PaymentType) => void;
  onUpdateEmployee: (id: number, name: string, paymentType: PaymentType) => void;
  onDeleteEmployee: (id: number) => void;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onRestoreSampleData: () => void;
  onClearAllData: () => void;
  onOpenAuthModal: () => void;
}

export const ConfigView: React.FC<ConfigViewProps> = ({
  suppliers,
  employees,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  darkMode,
  setDarkMode,
  onExportJSON,
  onImportJSON,
  onExportCSV,
  onRestoreSampleData,
  onClearAllData,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'employees' | 'system'>('suppliers');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supplier Form / Inline Edit state
  const [newSupplierName, setNewSupplierName] = useState('');
  const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
  const [editingSupplierName, setEditingSupplierName] = useState('');

  // Employee Form / Inline Edit state
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeePaymentType, setNewEmployeePaymentType] = useState<PaymentType>('Pagamento');
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editingEmployeeName, setEditingEmployeeName] = useState('');
  const [editingEmployeePaymentType, setEditingEmployeePaymentType] = useState<PaymentType>('Pagamento');

  // Supplier handlers
  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    onAddSupplier(newSupplierName.trim());
    setNewSupplierName('');
  };

  const startEditSupplier = (sup: Supplier) => {
    setEditingSupplierId(sup.id);
    setEditingSupplierName(sup.name);
  };

  const saveEditSupplier = (id: number) => {
    if (!editingSupplierName.trim()) return;
    onUpdateSupplier(id, editingSupplierName.trim());
    setEditingSupplierId(null);
  };

  // Employee handlers
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim()) return;
    onAddEmployee(newEmployeeName.trim(), newEmployeePaymentType);
    setNewEmployeeName('');
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditingEmployeeName(emp.name);
    setEditingEmployeePaymentType(emp.paymentType);
  };

  const saveEditEmployee = (id: number) => {
    if (!editingEmployeeName.trim()) return;
    onUpdateEmployee(id, editingEmployeeName.trim(), editingEmployeePaymentType);
    setEditingEmployeeId(null);
  };

  return (
    <div className="space-y-4">
      {/* Config Tabs Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-1.5 py-2 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'suppliers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Fornecedores ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-1.5 py-2 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'employees'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Funcionários ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-1.5 py-2 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'system'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Sistema & Backup</span>
        </button>
      </div>

      {/* TAB 1: FORNECEDORES */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {/* Add Supplier Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              + Novo Fornecedor
            </h3>
            <form onSubmit={handleAddSupplier} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Nome do Fornecedor..."
                className="w-full sm:flex-1 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
                required
              />
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded shadow-2xs transition-colors h-7.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </form>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3 w-14 text-center font-mono">ID</th>
                    <th className="py-2 px-3">Nome do Fornecedor</th>
                    <th className="py-2 px-3 w-28 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-[11px]">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        Nenhum fornecedor cadastrado.
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-1.5 px-3 text-center font-mono text-slate-500 text-[10px]">
                          #{sup.id}
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-white">
                          {editingSupplierId === sup.id ? (
                            <input
                              type="text"
                              value={editingSupplierName}
                              onChange={(e) => setEditingSupplierName(e.target.value)}
                              className="w-full px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs text-slate-900 dark:text-white focus:outline-none h-6"
                              autoFocus
                            />
                          ) : (
                            sup.name
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          {editingSupplierId === sup.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEditSupplier(sup.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSupplierId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => startEditSupplier(sup)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteSupplier(sup.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded"
                                title="Deletar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUNCIONÁRIOS */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Add Employee Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              + Novo Funcionário
            </h3>
            <form onSubmit={handleAddEmployee} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <input
                  type="text"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="Nome do Funcionário..."
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
                  required
                />
              </div>
              <div>
                <select
                  value={newEmployeePaymentType}
                  onChange={(e) => setNewEmployeePaymentType(e.target.value as PaymentType)}
                  className="w-full px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
                >
                  <option value="Pagamento">Pagamento</option>
                  <option value="Adiantamento">Adiantamento</option>
                </select>
              </div>
              <div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded shadow-2xs transition-colors h-7.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>
            </form>
          </div>

          {/* Employees Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2 px-3 w-14 text-center font-mono">ID</th>
                    <th className="py-2 px-3">Nome do Funcionário</th>
                    <th className="py-2 px-3">Tipo de Pagamento</th>
                    <th className="py-2 px-3 w-28 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-[11px]">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        Nenhum funcionário cadastrado.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-1.5 px-3 text-center font-mono text-slate-500 text-[10px]">
                          #{emp.id}
                        </td>
                        <td className="py-1.5 px-3 font-medium text-slate-900 dark:text-white">
                          {editingEmployeeId === emp.id ? (
                            <input
                              type="text"
                              value={editingEmployeeName}
                              onChange={(e) => setEditingEmployeeName(e.target.value)}
                              className="w-full px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs text-slate-900 dark:text-white focus:outline-none h-6"
                              autoFocus
                            />
                          ) : (
                            emp.name
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300">
                          {editingEmployeeId === emp.id ? (
                            <select
                              value={editingEmployeePaymentType}
                              onChange={(e) => setEditingEmployeePaymentType(e.target.value as PaymentType)}
                              className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-blue-500 rounded text-xs text-slate-900 dark:text-white focus:outline-none h-6"
                            >
                              <option value="Pagamento">Pagamento</option>
                              <option value="Adiantamento">Adiantamento</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex px-1.5 py-0.25 rounded text-[10px] font-semibold ${
                                emp.paymentType === 'Adiantamento'
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {emp.paymentType}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          {editingEmployeeId === emp.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEditEmployee(emp.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded"
                                title="Salvar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingEmployeeId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => startEditEmployee(emp)}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded"
                                title="Editar"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteEmployee(emp.id)}
                                className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded"
                                title="Deletar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SISTEMA & BACKUP */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onImportJSON}
            accept=".json"
            className="hidden"
          />

          {/* Autenticação e Nuvem */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              Sincronização & Conta
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Gerencie seu acesso e sincronização em nuvem via Firebase Firestore.
            </p>
            <div className="flex items-center gap-3">
              <UserMenu onOpenAuthModal={onOpenAuthModal} />
            </div>
          </div>

          {/* Exportar & Backup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              Exportar & Backup de Dados
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Faça download dos seus dados ou importe um backup salvo anteriormente.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={onExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded shadow-2xs transition-colors"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={onExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Exportar Backup (JSON)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded border border-slate-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span>Importar Backup (JSON)</span>
              </button>
            </div>
          </div>

          {/* Preferências & Manutenção */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
              Preferências & Manutenção
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Alterne o tema do sistema ou restaure dados iniciais.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 transition-colors"
              >
                {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
                <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
              </button>

              <button
                onClick={onRestoreSampleData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 text-xs font-semibold rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restaurar Dados Exemplo</span>
              </button>

              <button
                onClick={onClearAllData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50 text-xs font-semibold rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Todos os Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

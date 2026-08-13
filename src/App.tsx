import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Employee, Entry, CalculatedEntry, PaymentType } from './types';
import { INITIAL_SUPPLIERS, INITIAL_EMPLOYEES, INITIAL_ENTRIES } from './data/initialData';
import { calculateEntryDetails, exportToCSV, getTodayDateString } from './utils/calculations';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { EntriesView } from './components/EntriesView';
import { ConfigView } from './components/ConfigView';
import { AuthProvider } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entries' | 'config'>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_preference') === 'dark';
  });

  // LocalStorage State Initialization
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('cap_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('cap_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [rawEntries, setRawEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem('cap_entries');
    return saved ? JSON.parse(saved) : INITIAL_ENTRIES;
  });

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Firebase Firestore Real-time Sync
  const {
    saveEntryToFirestore,
    deleteEntryFromFirestore,
    saveSupplierToFirestore,
    deleteSupplierFromFirestore,
    saveEmployeeToFirestore,
    deleteEmployeeFromFirestore,
  } = useFirebaseSync({
    rawEntries,
    setRawEntries,
    suppliers,
    setSuppliers,
    employees,
    setEmployees,
    showToast,
  });

  // Sync Dark Mode class on <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme_preference', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme_preference', 'light');
    }
  }, [darkMode]);

  // Sync state to LocalStorage as fallback
  useEffect(() => {
    localStorage.setItem('cap_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('cap_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('cap_entries', JSON.stringify(rawEntries));
  }, [rawEntries]);

  // Dynamically calculate statuses, interest, and totals
  const calculatedEntries: CalculatedEntry[] = useMemo(() => {
    const today = getTodayDateString();
    return rawEntries.map((e) => calculateEntryDetails(e, today));
  }, [rawEntries]);

  // Entry Operations
  const handleAddEntry = (newEntryData: Omit<Entry, 'id'>) => {
    const maxId = rawEntries.reduce((max, e) => Math.max(max, e.id), 0);
    const newEntry: Entry = {
      ...newEntryData,
      id: maxId + 1,
    };
    setRawEntries((prev) => [newEntry, ...prev]);
    saveEntryToFirestore(newEntry);
    showToast('Lançamento adicionado com sucesso!');
  };

  const handleUpdateEntry = (updated: CalculatedEntry) => {
    const raw: Entry = {
      id: updated.id,
      favorecidoId: updated.favorecidoId,
      favorecidoName: updated.favorecidoName,
      favorecidoType: updated.favorecidoType,
      docType: updated.docType,
      nfNumber: updated.nfNumber,
      dueDate: updated.dueDate,
      value: updated.value,
      paymentDate: updated.paymentDate,
      interestRate: updated.interestRate,
    };
    setRawEntries((prev) =>
      prev.map((e) => (e.id === updated.id ? { ...raw } : e))
    );
    saveEntryToFirestore(raw);
    showToast('Lançamento atualizado com sucesso!');
  };

  const handleDeleteEntry = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
      setRawEntries((prev) => prev.filter((e) => e.id !== id));
      deleteEntryFromFirestore(id);
      showToast('Lançamento excluído.');
    }
  };

  const handleQuickTogglePaid = (id: number) => {
    const todayStr = getTodayDateString();
    setRawEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const isCurrentlyPaid = Boolean(e.paymentDate && e.paymentDate.trim() !== '');
          const updated = {
            ...e,
            paymentDate: isCurrentlyPaid ? '' : todayStr,
          };
          saveEntryToFirestore(updated);
          return updated;
        }
        return e;
      })
    );
    showToast('Status de pagamento alterado!');
  };

  // Supplier Operations
  const handleAddSupplier = (name: string) => {
    const maxId = suppliers.reduce((max, s) => Math.max(max, s.id), 0);
    const newSup: Supplier = { id: maxId + 1, name };
    setSuppliers((prev) => [...prev, newSup]);
    saveSupplierToFirestore(newSup);
    showToast(`Fornecedor "${name}" cadastrado!`);
  };

  const handleUpdateSupplier = (id: number, name: string) => {
    const updated = { id, name };
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? updated : s))
    );
    saveSupplierToFirestore(updated);
    showToast('Fornecedor atualizado!');
  };

  const handleDeleteSupplier = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      deleteSupplierFromFirestore(id);
      showToast('Fornecedor removido.');
    }
  };

  // Employee Operations
  const handleAddEmployee = (name: string, paymentType: PaymentType) => {
    const maxId = employees.reduce((max, emp) => Math.max(max, emp.id), 0);
    const newEmp: Employee = { id: maxId + 1, name, paymentType };
    setEmployees((prev) => [...prev, newEmp]);
    saveEmployeeToFirestore(newEmp);
    showToast(`Funcionário "${name}" cadastrado!`);
  };

  const handleUpdateEmployee = (id: number, name: string, paymentType: PaymentType) => {
    const updated = { id, name, paymentType };
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? updated : emp))
    );
    saveEmployeeToFirestore(updated);
    showToast('Funcionário atualizado!');
  };

  const handleDeleteEmployee = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este funcionário?')) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      deleteEmployeeFromFirestore(id);
      showToast('Funcionário removido.');
    }
  };

  // JSON Backup / Import / Export
  const handleExportJSON = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      suppliers,
      employees,
      entries: rawEntries,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_contas_a_pagar_${getTodayDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Backup JSON exportado com sucesso!');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.suppliers && parsed.employees && parsed.entries) {
          setSuppliers(parsed.suppliers);
          setEmployees(parsed.employees);
          setRawEntries(parsed.entries);
          showToast('Dados importados com sucesso!');
        } else {
          showToast('Formato de arquivo JSON inválido.', 'error');
        }
      } catch (err) {
        showToast('Erro ao ler arquivo JSON.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    exportToCSV(calculatedEntries);
    showToast('Relatório CSV exportado!');
  };

  const handleRestoreSampleData = () => {
    if (confirm('Restaurar os dados de exemplo pré-definidos? Os lançamentos atuais serão substituídos.')) {
      setSuppliers(INITIAL_SUPPLIERS);
      setEmployees(INITIAL_EMPLOYEES);
      setRawEntries(INITIAL_ENTRIES);
      showToast('Dados de exemplo restaurados com sucesso!');
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ ATENÇÃO: Deseja REALMENTE apagar TODOS os lançamentos, fornecedores e funcionários?')) {
      setSuppliers([]);
      setEmployees([]);
      setRawEntries([]);
      showToast('Todos os dados foram excluídos.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border text-sm font-medium animate-in slide-in-from-bottom-5 duration-200 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-700 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-4">
        {activeTab === 'dashboard' && (
          <Dashboard
            entries={calculatedEntries}
            suppliers={suppliers}
            employees={employees}
          />
        )}

        {activeTab === 'entries' && (
          <EntriesView
            entries={calculatedEntries}
            suppliers={suppliers}
            employees={employees}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onQuickTogglePaid={handleQuickTogglePaid}
          />
        )}

        {activeTab === 'config' && (
          <ConfigView
            suppliers={suppliers}
            employees={employees}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
            onExportCSV={handleExportCSV}
            onRestoreSampleData={handleRestoreSampleData}
            onClearAllData={handleClearAllData}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2.5 mt-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Sistema de Contas a Pagar &copy; {new Date().getFullYear()} &bull; High Density UI &bull; Firebase Cloud Sync &bull; Controle Financeiro Integrado
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Supplier, Employee, Entry, CalculatedEntry, PaymentType, IncomeEntry } from './types';
import { calculateEntryDetails, exportToCSV, getTodayDateString } from './utils/calculations';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { EntriesView } from './components/EntriesView';
import { ConfigView } from './components/ConfigView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { LoginView } from './components/LoginView';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'entries' | 'config'>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme_preference') === 'dark';
  });

  // State populated EXCLUSIVELY from Cloud Firestore via onSnapshot
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rawEntries, setRawEntries] = useState<Entry[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Firebase Firestore Direct Real-time Sync
  const {
    isSyncing,
    isOnline,
    lastSyncedAt,
    saveEntryToFirestore,
    deleteEntryFromFirestore,
    saveSupplierToFirestore,
    deleteSupplierFromFirestore,
    saveEmployeeToFirestore,
    deleteEmployeeFromFirestore,
    saveIncomeToFirestore,
    deleteIncomeFromFirestore,
  } = useFirebaseSync({
    setRawEntries,
    setSuppliers,
    setEmployees,
    setIncomes,
    showToast,
  });

  // Dark Mode preference handling
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

  // Dynamically calculate statuses, interest, and totals in memory
  const calculatedEntries: CalculatedEntry[] = useMemo(() => {
    const today = getTodayDateString();
    return rawEntries.map((e) => calculateEntryDetails(e, today));
  }, [rawEntries]);

  // Entry Operations (Direct Cloud Firestore)
  const handleAddEntry = async (newEntryData: Omit<Entry, 'id'>) => {
    const maxId = rawEntries.reduce((max, e) => Math.max(max, e.id), 0);
    const newEntry: Entry = {
      ...newEntryData,
      id: maxId > 0 ? maxId + 1 : Date.now(),
    };
    await saveEntryToFirestore(newEntry);
    showToast('Boleto/Lançamento salvo no Firestore com sucesso!');
  };

  const handleUpdateEntry = async (updated: CalculatedEntry) => {
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
    await saveEntryToFirestore(raw);
    showToast('Lançamento atualizado no Firestore com sucesso!');
  };

  const handleDeleteEntry = async (id: number) => {
    await deleteEntryFromFirestore(id);
    showToast('Lançamento excluído do Firestore.');
  };

  const handleDeleteMultipleEntries = async (ids: number[]) => {
    for (const id of ids) {
      await deleteEntryFromFirestore(id);
    }
    showToast(`${ids.length} lançamentos excluídos do Firestore.`);
  };

  const handleQuickTogglePaid = async (id: number) => {
    const target = rawEntries.find((e) => e.id === id);
    if (!target) return;
    const todayStr = getTodayDateString();
    const isCurrentlyPaid = Boolean(target.paymentDate && target.paymentDate.trim() !== '');
    const updated: Entry = {
      ...target,
      paymentDate: isCurrentlyPaid ? '' : todayStr,
    };
    await saveEntryToFirestore(updated);
    showToast(isCurrentlyPaid ? 'Status alterado para Em Aberto.' : 'Pagamento registrado com sucesso!');
  };

  // Supplier Operations (Direct Cloud Firestore)
  const handleAddSupplier = async (name: string) => {
    const maxId = suppliers.reduce((max, s) => Math.max(max, s.id), 0);
    const newSup: Supplier = { id: maxId > 0 ? maxId + 1 : Date.now(), name };
    await saveSupplierToFirestore(newSup);
    showToast(`Fornecedor "${name}" salvo no Firestore!`);
  };

  const handleUpdateSupplier = async (id: number, name: string) => {
    const updated = { id, name };
    await saveSupplierToFirestore(updated);
    showToast('Fornecedor atualizado no Firestore!');
  };

  const handleDeleteSupplier = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este fornecedor do Firestore?')) {
      await deleteSupplierFromFirestore(id);
      showToast('Fornecedor removido do Firestore.');
    }
  };

  // Employee Operations (Direct Cloud Firestore)
  const handleAddEmployee = async (name: string, paymentType: PaymentType) => {
    const maxId = employees.reduce((max, emp) => Math.max(max, emp.id), 0);
    const newEmp: Employee = { id: maxId > 0 ? maxId + 1 : Date.now(), name, paymentType };
    await saveEmployeeToFirestore(newEmp);
    showToast(`Funcionário "${name}" salvo no Firestore!`);
  };

  const handleUpdateEmployee = async (id: number, name: string, paymentType: PaymentType) => {
    const updated = { id, name, paymentType };
    await saveEmployeeToFirestore(updated);
    showToast('Funcionário atualizado no Firestore!');
  };

  const handleDeleteEmployee = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este funcionário do Firestore?')) {
      await deleteEmployeeFromFirestore(id);
      showToast('Funcionário removido do Firestore.');
    }
  };

  // Income Operations (Direct Cloud Firestore)
  const handleAddIncome = async (newIncomeData: Omit<IncomeEntry, 'id'>) => {
    const maxId = incomes.reduce((max, inc) => Math.max(max, inc.id), 0);
    const newIncome: IncomeEntry = {
      ...newIncomeData,
      id: maxId > 0 ? maxId + 1 : Date.now(),
    };
    await saveIncomeToFirestore(newIncome);
    showToast(`Entrada da empresa "${newIncome.companyName}" salva no Firestore!`);
  };

  const handleDeleteIncome = async (id: number) => {
    await deleteIncomeFromFirestore(id);
    showToast('Entrada excluída do Firestore.');
  };

  // JSON Backup / Import / Export to Firestore
  const handleExportJSON = () => {
    const backupData = {
      version: '2.0-cloud',
      exportedAt: new Date().toISOString(),
      suppliers,
      employees,
      entries: rawEntries,
      incomes,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_firestore_contas_${getTodayDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Backup JSON exportado com sucesso!');
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.suppliers && parsed.employees && parsed.entries) {
          showToast('Importando dados para o Cloud Firestore...', 'success');
          // Write all to Firestore
          if (Array.isArray(parsed.suppliers)) {
            for (const s of parsed.suppliers) await saveSupplierToFirestore(s);
          }
          if (Array.isArray(parsed.employees)) {
            for (const emp of parsed.employees) await saveEmployeeToFirestore(emp);
          }
          if (Array.isArray(parsed.entries)) {
            for (const entry of parsed.entries) await saveEntryToFirestore(entry);
          }
          if (Array.isArray(parsed.incomes)) {
            for (const inc of parsed.incomes) await saveIncomeToFirestore(inc);
          }
          showToast('Dados salvos no Cloud Firestore com sucesso!');
        } else {
          showToast('Formato de arquivo JSON inválido.', 'error');
        }
      } catch (err) {
        showToast('Erro ao ler ou importar arquivo JSON para o Firestore.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportCSV = () => {
    exportToCSV(calculatedEntries);
    showToast('Relatório CSV exportado!');
  };

  const handleClearAllData = async () => {
    if (confirm('⚠️ ATENÇÃO: Deseja REALMENTE apagar TODOS os lançamentos, receitas, fornecedores e funcionários do Firestore?')) {
      for (const e of rawEntries) await deleteEntryFromFirestore(e.id);
      for (const s of suppliers) await deleteSupplierFromFirestore(s.id);
      for (const emp of employees) await deleteEmployeeFromFirestore(emp.id);
      for (const inc of incomes) await deleteIncomeFromFirestore(inc.id);
      showToast('Todos os dados foram excluídos do Firestore.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="relative mb-4">
          <img
            src="/icons/icon_512x512.png"
            alt="Carregando..."
            className="w-16 h-16 rounded-2xl animate-pulse shadow-2xl border border-slate-800 bg-slate-900 p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/icons/icon_128x128.png';
            }}
          />
        </div>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-slate-400 font-medium">Carregando dados do Cloud Firestore...</p>
      </div>
    );
  }

  // Force login view to ensure every interaction uses Firebase Auth and Firestore Cloud
  if (!user) {
    return <LoginView />;
  }

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
        isSyncing={isSyncing}
        isOnline={isOnline}
        lastSyncedAt={lastSyncedAt}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 lg:px-6 py-3 sm:py-4 pb-24 sm:pb-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            entries={calculatedEntries}
            suppliers={suppliers}
            employees={employees}
            incomes={incomes}
          />
        )}

        {activeTab === 'entries' && (
          <EntriesView
            entries={calculatedEntries}
            suppliers={suppliers}
            employees={employees}
            incomes={incomes}
            onAddEntry={handleAddEntry}
            onUpdateEntry={handleUpdateEntry}
            onDeleteEntry={handleDeleteEntry}
            onDeleteMultipleEntries={handleDeleteMultipleEntries}
            onQuickTogglePaid={handleQuickTogglePaid}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
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
            onRestoreSampleData={() => {
              showToast('Para manter a integridade, use o cadastro direto de novos boletos.', 'error');
            }}
            onClearAllData={handleClearAllData}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isSyncing={isSyncing}
            isOnline={isOnline}
            lastSyncedAt={lastSyncedAt}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-2.5 mt-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Sistema de Contas a Pagar &copy; {new Date().getFullYear()} &bull; Google Cloud Firestore Realtime &bull; 100% Nuvem
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

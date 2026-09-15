import type React from 'react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  db,
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
} from '../lib/firebase';
import { Entry, Supplier, Employee, IncomeEntry } from '../types';
import { parseCurrencyInput } from '../utils/calculations';

interface FirebaseSyncParams {
  setRawEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeEntry[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function useFirebaseSync({
  setRawEntries,
  setSuppliers,
  setEmployees,
  setIncomes,
  showToast,
}: FirebaseSyncParams) {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const initialLoadDone = useRef(false);

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conectado à nuvem Firebase.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Sem conexão de rede.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const updateSyncTimestamp = useCallback(() => {
    setLastSyncedAt(new Date());
  }, []);

  // Real-time Firestore onSnapshot listeners for 100% cloud-authoritative data
  useEffect(() => {
    if (!user) {
      setRawEntries([]);
      setSuppliers([]);
      setEmployees([]);
      setIncomes([]);
      initialLoadDone.current = false;
      return;
    }

    const uid = user.uid;
    setIsSyncing(true);

    // 1. Real-time onSnapshot for ENTRIES (Boletos e Contas a Pagar)
    const qEntries = query(collection(db, 'entries'), where('userId', '==', uid));
    const unsubEntries = onSnapshot(
      qEntries,
      (snapshot) => {
        setIsSyncing(false);
        updateSyncTimestamp();
        const fetchedEntries: Entry[] = snapshot.docs.map((d) => {
          const data = d.data();
          const docIdNum = Number(data.id ?? d.id.replace(/^.*_entry_/, ''));

          // Value parsing: supports data.value, data.valor, data.amount, data.total
          const rawVal = data.value !== undefined && data.value !== null && data.value !== ''
            ? data.value
            : (data.valor !== undefined && data.valor !== null && data.valor !== ''
              ? data.valor
              : (data.amount !== undefined && data.amount !== null && data.amount !== ''
                ? data.amount
                : (data.total !== undefined && data.total !== null && data.total !== ''
                  ? data.total
                  : 0)));
          const parsedVal = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : parseCurrencyInput(rawVal);
          const safeVal = !isNaN(parsedVal) && parsedVal >= 0 ? parsedVal : 0;

          // Favorecido name extraction: supports multiple common field aliases
          const rawName = (
            data.favorecidoName ||
            data.supplierName ||
            data.fornecedor ||
            data.fornecedorNome ||
            data.favorecido ||
            data.nome ||
            data.nomeFavorecido ||
            data.name ||
            data.razaoSocial ||
            ''
          ).toString().trim();

          const rawFavorecidoId = (data.favorecidoId || data.supplierId || data.fornecedorId || '').toString().trim();

          let rawFavorecidoType = (data.favorecidoType || data.tipoFavorecido || '').toString().trim();
          if (rawFavorecidoType !== 'Fornecedor' && rawFavorecidoType !== 'Funcionário') {
            rawFavorecidoType = rawFavorecidoId.startsWith('func-') ? 'Funcionário' : 'Fornecedor';
          }

          const rawDocType = (data.docType || data.tipoDocumento || data.tipoDoc || 'Boleto').toString().trim();
          const rawDueDate = (data.dueDate || data.dataVencimento || data.vencimento || '').toString().trim();
          const rawNfNumber = (data.nfNumber || data.numeroNF || data.notaFiscal || '').toString().trim();
          const rawPaymentDate = (data.paymentDate || data.dataPagamento || '').toString().trim();
          const rawInterest = typeof data.interestRate === 'number' && !isNaN(data.interestRate)
            ? data.interestRate
            : parseCurrencyInput(data.interestRate ?? data.juros ?? 0);

          return {
            id: isNaN(docIdNum) ? Date.now() : docIdNum,
            favorecidoId: rawFavorecidoId,
            favorecidoName: rawName,
            favorecidoType: rawFavorecidoType as 'Fornecedor' | 'Funcionário',
            docType: rawDocType,
            nfNumber: rawNfNumber,
            dueDate: rawDueDate,
            value: safeVal,
            paymentDate: rawPaymentDate,
            interestRate: !isNaN(rawInterest) ? rawInterest : 0,
          };
        });
        fetchedEntries.sort((a, b) => b.id - a.id);
        setRawEntries(fetchedEntries);
      },
      (err) => {
        setIsSyncing(false);
        console.error('Erro Firestore Lançamentos:', err);
        showToast('Erro ao carregar lançamentos do Firestore.', 'error');
      }
    );

    // 2. Real-time onSnapshot for SUPPLIERS (Fornecedores)
    const qSuppliers = query(collection(db, 'suppliers'), where('userId', '==', uid));
    const unsubSuppliers = onSnapshot(
      qSuppliers,
      (snapshot) => {
        updateSyncTimestamp();
        const fetchedSuppliers: Supplier[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: Number(data.id ?? d.id),
            name: data.name || '',
          };
        });
        fetchedSuppliers.sort((a, b) => a.id - b.id);
        setSuppliers(fetchedSuppliers);
      },
      (err) => {
        console.error('Erro Firestore Fornecedores:', err);
      }
    );

    // 3. Real-time onSnapshot for EMPLOYEES (Funcionários)
    const qEmployees = query(collection(db, 'employees'), where('userId', '==', uid));
    const unsubEmployees = onSnapshot(
      qEmployees,
      (snapshot) => {
        updateSyncTimestamp();
        const fetchedEmployees: Employee[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: Number(data.id ?? d.id),
            name: data.name || '',
            paymentType: data.paymentType === 'Adiantamento' ? 'Adiantamento' : 'Pagamento',
          };
        });
        fetchedEmployees.sort((a, b) => a.id - b.id);
        setEmployees(fetchedEmployees);
      },
      (err) => {
        console.error('Erro Firestore Funcionários:', err);
      }
    );

    // 4. Real-time onSnapshot for INCOMES (Entradas / Receitas)
    const qIncomes = query(collection(db, 'incomes'), where('userId', '==', uid));
    const unsubIncomes = onSnapshot(
      qIncomes,
      (snapshot) => {
        updateSyncTimestamp();
        const fetchedIncomes: IncomeEntry[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: Number(data.id ?? d.id),
            companyName: data.companyName || '',
            value: Number(data.value || 0),
            date: data.date || '',
            description: data.description || '',
          };
        });
        fetchedIncomes.sort((a, b) => b.id - a.id);
        setIncomes(fetchedIncomes);
        initialLoadDone.current = true;
      },
      (err) => {
        console.error('Erro Firestore Receitas:', err);
      }
    );

    return () => {
      unsubEntries();
      unsubSuppliers();
      unsubEmployees();
      unsubIncomes();
    };
  }, [user]);

  // Cloud Firestore direct write operations
  const saveEntryToFirestore = async (entry: Entry) => {
    if (!user) {
      showToast('Faça login para salvar na nuvem.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const parsedVal = typeof entry.value === 'number' && !isNaN(entry.value)
        ? entry.value
        : parseCurrencyInput(entry.value ?? 0);
      const safeValue = !isNaN(parsedVal) && parsedVal >= 0 ? parsedVal : 0;
      const safeFavorecidoName = (entry.favorecidoName || '').trim() || 'Fornecedor não informado';

      const docRef = doc(db, 'entries', `${user.uid}_entry_${entry.id}`);
      await setDoc(
        docRef,
        {
          ...entry,
          favorecidoName: safeFavorecidoName,
          value: safeValue,
          valor: safeValue, // backward-compat alias
          favorecidoType: entry.favorecidoType || 'Fornecedor',
          docType: entry.docType || 'Boleto',
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar lançamento no Firestore:', err);
      showToast('Erro ao salvar lançamento no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteEntryFromFirestore = async (entryId: number) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'entries', `${user.uid}_entry_${entryId}`);
      await deleteDoc(docRef);
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao excluir lançamento no Firestore:', err);
      showToast('Erro ao excluir lançamento no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const saveSupplierToFirestore = async (supplier: Supplier) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'suppliers', `${user.uid}_sup_${supplier.id}`);
      await setDoc(
        docRef,
        {
          ...supplier,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar fornecedor no Firestore:', err);
      showToast('Erro ao salvar fornecedor no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteSupplierFromFirestore = async (supplierId: number) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'suppliers', `${user.uid}_sup_${supplierId}`);
      await deleteDoc(docRef);
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao excluir fornecedor no Firestore:', err);
      showToast('Erro ao excluir fornecedor no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const saveEmployeeToFirestore = async (employee: Employee) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'employees', `${user.uid}_emp_${employee.id}`);
      await setDoc(
        docRef,
        {
          ...employee,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar funcionário no Firestore:', err);
      showToast('Erro ao salvar funcionário no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteEmployeeFromFirestore = async (employeeId: number) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'employees', `${user.uid}_emp_${employeeId}`);
      await deleteDoc(docRef);
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao excluir funcionário no Firestore:', err);
      showToast('Erro ao excluir funcionário no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const saveIncomeToFirestore = async (income: IncomeEntry) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'incomes', `${user.uid}_inc_${income.id}`);
      await setDoc(
        docRef,
        {
          ...income,
          userId: user.uid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar entrada no Firestore:', err);
      showToast('Erro ao salvar entrada no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteIncomeFromFirestore = async (incomeId: number) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'incomes', `${user.uid}_inc_${incomeId}`);
      await deleteDoc(docRef);
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao excluir entrada no Firestore:', err);
      showToast('Erro ao excluir entrada no Firestore.', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
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
  };
}

import type React from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
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

interface FirebaseSyncParams {
  rawEntries: Entry[];
  setRawEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  incomes: IncomeEntry[];
  setIncomes: React.Dispatch<React.SetStateAction<IncomeEntry[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function useFirebaseSync({
  rawEntries,
  setRawEntries,
  suppliers,
  setSuppliers,
  employees,
  setEmployees,
  incomes,
  setIncomes,
  showToast,
}: FirebaseSyncParams) {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    const saved = localStorage.getItem('cap_last_synced_at');
    return saved ? new Date(saved) : null;
  });

  // Track if initial snapshot has resolved for this session to avoid overwriting remote data
  const hasInitializedRef = useRef<boolean>(false);

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexão restabelecida. Sincronização em tempo real ativa!', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Modo offline: alterações serão salvas localmente e sincronizadas quando reconectar.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // Update timestamp helper
  const updateSyncTimestamp = useCallback(() => {
    const now = new Date();
    setLastSyncedAt(now);
    localStorage.setItem('cap_last_synced_at', now.toISOString());
  }, []);

  // Real-time Firestore Listeners with onSnapshot (instant cross-device sync)
  useEffect(() => {
    if (!user) {
      hasInitializedRef.current = false;
      return;
    }

    const uid = user.uid;
    setIsSyncing(true);

    const userMetaDocRef = doc(db, 'users', uid);

    // 1. Real-time onSnapshot listener for ENTRIES (Contas a Pagar)
    const qEntries = query(collection(db, 'entries'), where('userId', '==', uid));
    const unsubEntries = onSnapshot(
      qEntries,
      (snapshot) => {
        setIsSyncing(false);
        updateSyncTimestamp();

        if (!snapshot.empty) {
          const fetchedEntries: Entry[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: Number(data.id ?? d.id),
              favorecidoId: data.favorecidoId || '',
              favorecidoName: data.favorecidoName || '',
              favorecidoType: data.favorecidoType || 'Fornecedor',
              docType: data.docType || 'Boleto',
              nfNumber: data.nfNumber || '',
              dueDate: data.dueDate || '',
              value: Number(data.value || 0),
              paymentDate: data.paymentDate || '',
              interestRate: Number(data.interestRate || 0),
            };
          });
          // Sort newest ID first
          fetchedEntries.sort((a, b) => b.id - a.id);
          setRawEntries(fetchedEntries);
        } else if (!hasInitializedRef.current && rawEntries.length > 0) {
          // Initial seed to cloud if user has local items and cloud is completely empty
          rawEntries.forEach((entry) => {
            const docRef = doc(db, 'entries', `${uid}_entry_${entry.id}`);
            setDoc(docRef, { ...entry, userId: uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
          });
          setDoc(userMetaDocRef, { email: user.email, initializedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
        } else if (hasInitializedRef.current && snapshot.empty) {
          // If remote was cleared by user on another device
          setRawEntries([]);
        }
      },
      (err) => {
        setIsSyncing(false);
        console.warn('Erro no onSnapshot de Lançamentos:', err);
      }
    );

    // 2. Real-time onSnapshot listener for SUPPLIERS (Fornecedores)
    const qSuppliers = query(collection(db, 'suppliers'), where('userId', '==', uid));
    const unsubSuppliers = onSnapshot(
      qSuppliers,
      (snapshot) => {
        updateSyncTimestamp();
        if (!snapshot.empty) {
          const fetchedSuppliers: Supplier[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: Number(data.id ?? d.id),
              name: data.name || '',
            };
          });
          fetchedSuppliers.sort((a, b) => a.id - b.id);
          setSuppliers(fetchedSuppliers);
        } else if (!hasInitializedRef.current && suppliers.length > 0) {
          suppliers.forEach((s) => {
            const docRef = doc(db, 'suppliers', `${uid}_sup_${s.id}`);
            setDoc(docRef, { ...s, userId: uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
          });
        } else if (hasInitializedRef.current && snapshot.empty) {
          setSuppliers([]);
        }
      },
      (err) => console.warn('Erro no onSnapshot de Fornecedores:', err)
    );

    // 3. Real-time onSnapshot listener for EMPLOYEES (Funcionários)
    const qEmployees = query(collection(db, 'employees'), where('userId', '==', uid));
    const unsubEmployees = onSnapshot(
      qEmployees,
      (snapshot) => {
        updateSyncTimestamp();
        if (!snapshot.empty) {
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
        } else if (!hasInitializedRef.current && employees.length > 0) {
          employees.forEach((emp) => {
            const docRef = doc(db, 'employees', `${uid}_emp_${emp.id}`);
            setDoc(docRef, { ...emp, userId: uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
          });
        } else if (hasInitializedRef.current && snapshot.empty) {
          setEmployees([]);
        }
      },
      (err) => console.warn('Erro no onSnapshot de Funcionários:', err)
    );

    // 4. Real-time onSnapshot listener for INCOMES (Entradas Financeiras)
    const qIncomes = query(collection(db, 'incomes'), where('userId', '==', uid));
    const unsubIncomes = onSnapshot(
      qIncomes,
      (snapshot) => {
        updateSyncTimestamp();
        if (!snapshot.empty) {
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
        } else if (!hasInitializedRef.current && incomes.length > 0) {
          incomes.forEach((inc) => {
            const docRef = doc(db, 'incomes', `${uid}_inc_${inc.id}`);
            setDoc(docRef, { ...inc, userId: uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
          });
        } else if (hasInitializedRef.current && snapshot.empty) {
          setIncomes([]);
        }

        // Mark as initialized once all onSnapshot listeners are attached
        hasInitializedRef.current = true;
      },
      (err) => console.warn('Erro no onSnapshot de Entradas:', err)
    );

    return () => {
      unsubEntries();
      unsubSuppliers();
      unsubEmployees();
      unsubIncomes();
    };
  }, [user]);

  // Real-time write functions to update Firestore documents
  const saveEntryToFirestore = async (entry: Entry) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'entries', `${user.uid}_entry_${entry.id}`);
      await setDoc(docRef, { ...entry, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar lançamento no Firestore:', err);
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
    } finally {
      setIsSyncing(false);
    }
  };

  const saveSupplierToFirestore = async (supplier: Supplier) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'suppliers', `${user.uid}_sup_${supplier.id}`);
      await setDoc(docRef, { ...supplier, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar fornecedor no Firestore:', err);
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
    } finally {
      setIsSyncing(false);
    }
  };

  const saveEmployeeToFirestore = async (employee: Employee) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'employees', `${user.uid}_emp_${employee.id}`);
      await setDoc(docRef, { ...employee, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar funcionário no Firestore:', err);
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
    } finally {
      setIsSyncing(false);
    }
  };

  const saveIncomeToFirestore = async (income: IncomeEntry) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const docRef = doc(db, 'incomes', `${user.uid}_inc_${income.id}`);
      await setDoc(docRef, { ...income, userId: user.uid, updatedAt: new Date().toISOString() }, { merge: true });
      updateSyncTimestamp();
    } catch (err) {
      console.error('Erro ao salvar entrada no Firestore:', err);
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
    } finally {
      setIsSyncing(false);
    }
  };

  // Push full local state to Firestore
  const forceManualSync = async () => {
    if (!user) {
      showToast('Faça login para sincronizar com a nuvem.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const uid = user.uid;
      // Sync entries
      for (const entry of rawEntries) {
        const docRef = doc(db, 'entries', `${uid}_entry_${entry.id}`);
        await setDoc(docRef, { ...entry, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
      }
      // Sync suppliers
      for (const sup of suppliers) {
        const docRef = doc(db, 'suppliers', `${uid}_sup_${sup.id}`);
        await setDoc(docRef, { ...sup, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
      }
      // Sync employees
      for (const emp of employees) {
        const docRef = doc(db, 'employees', `${uid}_emp_${emp.id}`);
        await setDoc(docRef, { ...emp, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
      }
      // Sync incomes
      for (const inc of incomes) {
        const docRef = doc(db, 'incomes', `${uid}_inc_${inc.id}`);
        await setDoc(docRef, { ...inc, userId: uid, updatedAt: new Date().toISOString() }, { merge: true });
      }

      updateSyncTimestamp();
      showToast('Sincronização em tempo real atualizada com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao sincronizar com o Firestore:', err);
      showToast('Erro ao sincronizar dados com o servidor.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    isSyncing,
    isOnline,
    lastSyncedAt,
    forceManualSync,
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

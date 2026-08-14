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
  getDocs,
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

  // Track if initial snapshot has resolved for this session
  const hasInitializedRef = useRef<boolean>(false);

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexão restabelecida. Sincronizando dados...', 'success');
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

  // 1. Real-time Firestore sync with onSnapshot listeners
  useEffect(() => {
    if (!user) {
      hasInitializedRef.current = false;
      return;
    }

    const uid = user.uid;
    setIsSyncing(true);

    // Track user meta to know if user already initialized cloud data
    const userMetaDocRef = doc(db, 'users', uid);

    // 1. Listen to ENTRIES collection
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
          fetchedEntries.sort((a, b) => b.id - a.id);
          setRawEntries(fetchedEntries);
        } else if (!hasInitializedRef.current && rawEntries.length > 0) {
          // If Firestore is empty on very first load of this user, seed it with current local entries
          rawEntries.forEach((entry) => {
            const docRef = doc(db, 'entries', `${uid}_entry_${entry.id}`);
            setDoc(docRef, { ...entry, userId: uid, updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
          });
          setDoc(userMetaDocRef, { email: user.email, initializedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
        } else if (hasInitializedRef.current && snapshot.empty) {
          // Remote emptied by user
          setRawEntries([]);
        }
      },
      (err) => {
        setIsSyncing(false);
        console.warn('Firestore Entries Snapshot error:', err);
      }
    );

    // 2. Listen to SUPPLIERS collection
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
      (err) => console.warn('Firestore Suppliers Snapshot error:', err)
    );

    // 3. Listen to EMPLOYEES collection
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
      (err) => console.warn('Firestore Employees Snapshot error:', err)
    );

    // 4. Listen to INCOMES collection
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

        // Mark as initialized once all listeners set up
        hasInitializedRef.current = true;
      },
      (err) => console.warn('Firestore Incomes Snapshot error:', err)
    );

    // 5. Visibility / Window Focus Refresh (for instant sync when user unlocks iPhone or switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        setIsSyncing(true);
        // Force a touch on the connection
        getDocs(query(collection(db, 'entries'), where('userId', '==', uid)))
          .then((snap) => {
            setIsSyncing(false);
            updateSyncTimestamp();
            if (!snap.empty) {
              const freshEntries: Entry[] = snap.docs.map((d) => {
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
              freshEntries.sort((a, b) => b.id - a.id);
              setRawEntries(freshEntries);
            }
          })
          .catch((err) => {
            setIsSyncing(false);
            console.warn('Visibility refresh error:', err);
          });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      unsubEntries();
      unsubSuppliers();
      unsubEmployees();
      unsubIncomes();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user]);

  // Helper functions to write to Firestore in real-time
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

  // Force manual sync on demand
  const forceManualSync = async () => {
    if (!user) {
      showToast('Faça login para sincronizar com a nuvem.', 'error');
      return;
    }
    setIsSyncing(true);
    try {
      const uid = user.uid;
      const [snapEntries, snapSuppliers, snapEmployees, snapIncomes] = await Promise.all([
        getDocs(query(collection(db, 'entries'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'suppliers'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'employees'), where('userId', '==', uid))),
        getDocs(query(collection(db, 'incomes'), where('userId', '==', uid))),
      ]);

      if (!snapEntries.empty) {
        const fetched = snapEntries.docs.map((d) => {
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
          } as Entry;
        });
        fetched.sort((a, b) => b.id - a.id);
        setRawEntries(fetched);
      }

      if (!snapSuppliers.empty) {
        const fetched = snapSuppliers.docs.map((d) => ({
          id: Number(d.data().id ?? d.id),
          name: d.data().name || '',
        }));
        fetched.sort((a, b) => a.id - b.id);
        setSuppliers(fetched);
      }

      if (!snapEmployees.empty) {
        const fetched = snapEmployees.docs.map((d) => ({
          id: Number(d.data().id ?? d.id),
          name: d.data().name || '',
          paymentType: d.data().paymentType === 'Adiantamento' ? 'Adiantamento' : ('Pagamento' as const),
        }));
        fetched.sort((a, b) => a.id - b.id);
        setEmployees(fetched);
      }

      if (!snapIncomes.empty) {
        const fetched = snapIncomes.docs.map((d) => ({
          id: Number(d.data().id ?? d.id),
          companyName: d.data().companyName || '',
          value: Number(d.data().value || 0),
          date: d.data().date || '',
          description: d.data().description || '',
        }));
        fetched.sort((a, b) => b.id - a.id);
        setIncomes(fetched);
      }

      updateSyncTimestamp();
      showToast('Sincronização em nuvem concluída com sucesso!', 'success');
    } catch (err) {
      console.error('Erro na sincronização manual:', err);
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

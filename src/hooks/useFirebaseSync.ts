import type React from 'react';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, collection, doc, setDoc, deleteDoc, query, where, onSnapshot } from '../lib/firebase';
import { Entry, Supplier, Employee } from '../types';

interface FirebaseSyncParams {
  rawEntries: Entry[];
  setRawEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function useFirebaseSync({
  rawEntries,
  setRawEntries,
  suppliers,
  setSuppliers,
  employees,
  setEmployees,
  showToast,
}: FirebaseSyncParams) {
  const { user } = useAuth();

  // 1. Real-time Firestore sync when authenticated
  useEffect(() => {
    if (!user) return;

    const uid = user.uid;

    // Listen to ENTRIES collection
    const qEntries = query(collection(db, 'entries'), where('userId', '==', uid));
    const unsubEntries = onSnapshot(
      qEntries,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedEntries: Entry[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: Number(data.id || d.id),
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
        } else if (rawEntries.length > 0) {
          // Initial sync of existing local entries to Cloud Firestore
          rawEntries.forEach((entry) => {
            const docRef = doc(db, 'entries', `${uid}_entry_${entry.id}`);
            setDoc(docRef, { ...entry, userId: uid }, { merge: true }).catch(console.error);
          });
          showToast('Dados locais sincronizados com o Firestore!', 'success');
        }
      },
      (err) => console.warn('Firestore Entries Snapshot error:', err)
    );

    // Listen to SUPPLIERS collection
    const qSuppliers = query(collection(db, 'suppliers'), where('userId', '==', uid));
    const unsubSuppliers = onSnapshot(
      qSuppliers,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedSuppliers: Supplier[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: Number(data.id || d.id),
              name: data.name || '',
            };
          });
          fetchedSuppliers.sort((a, b) => a.id - b.id);
          setSuppliers(fetchedSuppliers);
        } else if (suppliers.length > 0) {
          suppliers.forEach((s) => {
            const docRef = doc(db, 'suppliers', `${uid}_sup_${s.id}`);
            setDoc(docRef, { ...s, userId: uid }, { merge: true }).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore Suppliers Snapshot error:', err)
    );

    // Listen to EMPLOYEES collection
    const qEmployees = query(collection(db, 'employees'), where('userId', '==', uid));
    const unsubEmployees = onSnapshot(
      qEmployees,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedEmployees: Employee[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: Number(data.id || d.id),
              name: data.name || '',
              paymentType: data.paymentType || 'Mensalista',
            };
          });
          fetchedEmployees.sort((a, b) => a.id - b.id);
          setEmployees(fetchedEmployees);
        } else if (employees.length > 0) {
          employees.forEach((emp) => {
            const docRef = doc(db, 'employees', `${uid}_emp_${emp.id}`);
            setDoc(docRef, { ...emp, userId: uid }, { merge: true }).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore Employees Snapshot error:', err)
    );

    return () => {
      unsubEntries();
      unsubSuppliers();
      unsubEmployees();
    };
  }, [user]);

  // Helper functions to write to Firestore
  const saveEntryToFirestore = async (entry: Entry) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'entries', `${user.uid}_entry_${entry.id}`);
      await setDoc(docRef, { ...entry, userId: user.uid }, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar no Firestore:', err);
    }
  };

  const deleteEntryFromFirestore = async (entryId: number) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'entries', `${user.uid}_entry_${entryId}`);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erro ao excluir no Firestore:', err);
    }
  };

  const saveSupplierToFirestore = async (supplier: Supplier) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'suppliers', `${user.uid}_sup_${supplier.id}`);
      await setDoc(docRef, { ...supplier, userId: user.uid }, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar fornecedor no Firestore:', err);
    }
  };

  const deleteSupplierFromFirestore = async (supplierId: number) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'suppliers', `${user.uid}_sup_${supplierId}`);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erro ao excluir fornecedor no Firestore:', err);
    }
  };

  const saveEmployeeToFirestore = async (employee: Employee) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'employees', `${user.uid}_emp_${employee.id}`);
      await setDoc(docRef, { ...employee, userId: user.uid }, { merge: true });
    } catch (err) {
      console.error('Erro ao salvar funcionário no Firestore:', err);
    }
  };

  const deleteEmployeeFromFirestore = async (employeeId: number) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'employees', `${user.uid}_emp_${employeeId}`);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Erro ao excluir funcionário no Firestore:', err);
    }
  };

  return {
    saveEntryToFirestore,
    deleteEntryFromFirestore,
    saveSupplierToFirestore,
    deleteSupplierFromFirestore,
    saveEmployeeToFirestore,
    deleteEmployeeFromFirestore,
  };
}

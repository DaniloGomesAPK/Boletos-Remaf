import React, { useState, useMemo, useEffect } from 'react';
import { CalculatedEntry, EntitySummary, Supplier, Employee, IncomeEntry } from '../types';
import { formatBRL, calculateSummaries, MONTHS_PT, getMonthYearFromDateStr } from '../utils/calculations';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Search,
  ArrowUpDown,
  UserCheck,
  Truck,
  RotateCcw,
  BarChart3,
  TrendingUp,
  Award,
  Building2,
  Receipt,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';

interface DashboardProps {
  entries: CalculatedEntry[];
  suppliers: Supplier[];
  employees: Employee[];
  incomes?: IncomeEntry[];
}

const STORAGE_KEY_MODE = 'contas_pagar_period_mode'; // 'MONTH' | 'ALL'
const STORAGE_KEY_MONTH = 'contas_pagar_period_month'; // e.g. 8
const STORAGE_KEY_YEAR = 'contas_pagar_period_year'; // e.g. 2026

export const Dashboard: React.FC<DashboardProps> = ({ entries, suppliers, employees, incomes = [] }) => {
  // Current real date defaults
  const today = new Date();
  const currentMonthNum = today.getMonth() + 1; // 1-12
  const currentYearNum = today.getFullYear(); // e.g. 2026

  // 1. Initial State from URL params or localStorage or defaults
  const [filterMode, setFilterMode] = useState<'MONTH' | 'ALL'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const monthParam = urlParams.get('month');
    if (monthParam === 'ALL') return 'ALL';
    const savedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (savedMode === 'ALL') return 'ALL';
    return 'MONTH';
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const m = urlParams.get('month');
    if (m && m !== 'ALL') {
      const parsed = parseInt(m, 10);
      if (parsed >= 1 && parsed <= 12) return parsed;
    }
    const saved = localStorage.getItem(STORAGE_KEY_MONTH);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 1 && parsed <= 12) return parsed;
    }
    // Default to current month or August (8) if in 2026
    return currentMonthNum;
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const y = urlParams.get('year');
    if (y) {
      const parsed = parseInt(y, 10);
      if (parsed >= 2020 && parsed <= 2030) return parsed;
    }
    const saved = localStorage.getItem(STORAGE_KEY_YEAR);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (parsed >= 2020 && parsed <= 2030) return parsed;
    }
    return currentYearNum;
  });

  // Table Controls State
  const [filterType, setFilterType] = useState<'Todos' | 'Fornecedor' | 'Funcionário'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof EntitySummary>('balanceDue');
  const [sortAsc, setSortAsc] = useState(false);

  // Sync state changes to localStorage and URL search params
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, filterMode);
    localStorage.setItem(STORAGE_KEY_MONTH, String(selectedMonth));
    localStorage.setItem(STORAGE_KEY_YEAR, String(selectedYear));

    const url = new URL(window.location.href);
    if (filterMode === 'ALL') {
      url.searchParams.set('month', 'ALL');
      url.searchParams.delete('year');
    } else {
      url.searchParams.set('month', String(selectedMonth).padStart(2, '0'));
      url.searchParams.set('year', String(selectedYear));
    }
    window.history.replaceState({}, '', url.toString());
  }, [filterMode, selectedMonth, selectedYear]);

  // Handle Month Shortcut Actions
  const handleSelectCurrentMonth = () => {
    setFilterMode('MONTH');
    setSelectedMonth(currentMonthNum);
    setSelectedYear(currentYearNum);
  };

  const handleResetToAll = () => {
    setFilterMode('ALL');
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterMode('MONTH');
    setSelectedMonth(parseInt(e.target.value, 10));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterMode('MONTH');
    setSelectedYear(parseInt(e.target.value, 10));
  };

  // Label for active period scope
  const monthName = MONTHS_PT.find((m) => m.value === selectedMonth)?.label || 'Agosto';
  const periodLabel = filterMode === 'ALL' ? 'Todos os Períodos' : `${monthName}/${selectedYear}`;

  // 2. Filter Entries by Selected Month/Year
  // helper to check if a YYYY-MM-DD date falls in selected month & year
  const isDateInSelectedPeriod = (dateStr: string | undefined): boolean => {
    if (!dateStr) return false;
    const parts = getMonthYearFromDateStr(dateStr);
    if (!parts) return false;
    return parts.month === selectedMonth && parts.year === selectedYear;
  };

  // Filtered subset for Supplier/Employee Summary Table
  const filteredEntriesForPeriod = useMemo(() => {
    if (filterMode === 'ALL') return entries;

    return entries.filter((e) => {
      // Check if due date is in selected period
      const isDueInPeriod = isDateInSelectedPeriod(e.dueDate);
      
      // Check if payment date is in selected period (if paid)
      const isPaidInPeriod = e.status === 'Pago' && e.paymentDate && isDateInSelectedPeriod(e.paymentDate);

      return isDueInPeriod || isPaidInPeriod;
    });
  }, [entries, filterMode, selectedMonth, selectedYear]);

  // 3. Dynamic Summary Cards Calculations
  // Card 1 - Total Atrasado
  const totalOverdue = useMemo(() => {
    return entries
      .filter((e) => {
        if (e.status !== 'Atrasado') return false;
        if (filterMode === 'ALL') return true;
        return isDateInSelectedPeriod(e.dueDate);
      })
      .reduce((sum, e) => sum + e.totalWithInterest, 0);
  }, [entries, filterMode, selectedMonth, selectedYear]);

  const countOverdue = useMemo(() => {
    return entries.filter((e) => {
      if (e.status !== 'Atrasado') return false;
      if (filterMode === 'ALL') return true;
      return isDateInSelectedPeriod(e.dueDate);
    }).length;
  }, [entries, filterMode, selectedMonth, selectedYear]);

  // Card 2 - Total À Vencer
  const totalToPay = useMemo(() => {
    return entries
      .filter((e) => {
        if (e.status !== 'À Vencer') return false;
        if (filterMode === 'ALL') return true;
        return isDateInSelectedPeriod(e.dueDate);
      })
      .reduce((sum, e) => sum + e.totalWithInterest, 0);
  }, [entries, filterMode, selectedMonth, selectedYear]);

  const countToPay = useMemo(() => {
    return entries.filter((e) => {
      if (e.status !== 'À Vencer') return false;
      if (filterMode === 'ALL') return true;
      return isDateInSelectedPeriod(e.dueDate);
    }).length;
  }, [entries, filterMode, selectedMonth, selectedYear]);

  // Card 3 - Total Pago
  // "Filtra lançamentos onde: Mês/Ano do Pagamento = mês selecionado E Status = 'Pago'"
  const totalPaid = useMemo(() => {
    return entries
      .filter((e) => {
        if (e.status !== 'Pago') return false;
        if (filterMode === 'ALL') return true;
        // If paymentDate is present, check paymentDate month & year; otherwise check dueDate
        if (e.paymentDate && e.paymentDate.trim() !== '') {
          return isDateInSelectedPeriod(e.paymentDate);
        }
        return isDateInSelectedPeriod(e.dueDate);
      })
      .reduce((sum, e) => sum + e.totalWithInterest, 0);
  }, [entries, filterMode, selectedMonth, selectedYear]);

  const countPaid = useMemo(() => {
    return entries.filter((e) => {
      if (e.status !== 'Pago') return false;
      if (filterMode === 'ALL') return true;
      if (e.paymentDate && e.paymentDate.trim() !== '') {
        return isDateInSelectedPeriod(e.paymentDate);
      }
      return isDateInSelectedPeriod(e.dueDate);
    }).length;
  }, [entries, filterMode, selectedMonth, selectedYear]);

  // Card 4 - Total Geral
  // "Filtra lançamentos onde: Mês/Ano do Vencimento = mês selecionado (TODOS os status)"
  const totalGeneral = useMemo(() => {
    return entries
      .filter((e) => {
        if (filterMode === 'ALL') return true;
        return isDateInSelectedPeriod(e.dueDate);
      })
      .reduce((sum, e) => sum + e.totalWithInterest, 0);
  }, [entries, filterMode, selectedMonth, selectedYear]);

  const countGeneral = useMemo(() => {
    return entries.filter((e) => {
      if (filterMode === 'ALL') return true;
      return isDateInSelectedPeriod(e.dueDate);
    }).length;
  }, [entries, filterMode, selectedMonth, selectedYear]);

  // Card 5 - Total Entradas (Receitas)
  const filteredIncomesForPeriod = useMemo(() => {
    if (filterMode === 'ALL') return incomes;
    return incomes.filter((inc) => isDateInSelectedPeriod(inc.date));
  }, [incomes, filterMode, selectedMonth, selectedYear]);

  const totalIncomesPeriod = useMemo(() => {
    return filteredIncomesForPeriod.reduce((sum, inc) => sum + inc.value, 0);
  }, [filteredIncomesForPeriod]);

  const countIncomesPeriod = useMemo(() => {
    return filteredIncomesForPeriod.length;
  }, [filteredIncomesForPeriod]);

  // Saldo Líquido Operacional do Período: Entradas - Despesas Pagas
  const netBalancePeriod = useMemo(() => {
    return totalIncomesPeriod - totalPaid;
  }, [totalIncomesPeriod, totalPaid]);

  // 4. Entity Summary Table Calculations based on filtered entries
  const entitySummaries = useMemo(() => {
    return calculateSummaries(filteredEntriesForPeriod, suppliers, employees);
  }, [filteredEntriesForPeriod, suppliers, employees]);

  // Filter & Sort Entity Summaries Table
  const filteredSummaries = useMemo(() => {
    // Filter out suppliers and employees that have 0 across all values (Pago, Atrasado, À Vencer)
    let list = entitySummaries.filter(
      (item) => item.valuePaid > 0 || item.valueOverdue > 0 || item.valueToPay > 0
    );

    if (filterType !== 'Todos') {
      list = list.filter((item) => item.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => item.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(a[sortField] as string);
      }
      const numA = Number(valA) || 0;
      const numB = Number(valB) || 0;
      return sortAsc ? numA - numB : numB - numA;
    });

    return list;
  }, [entitySummaries, filterType, searchQuery, sortField, sortAsc]);

  const handleSort = (field: keyof EntitySummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending
    }
  };

  // 5. Chart Data Calculations

  // CHART 1: Evolução por Mês (últimos 6 meses) - Com Entradas e Saídas
  const chartEvolucaoData = useMemo(() => {
    const endYear = filterMode === 'ALL' ? currentYearNum : selectedYear;
    const endMonth = filterMode === 'ALL' ? currentMonthNum : selectedMonth;

    const result = [];
    for (let i = 5; i >= 0; i--) {
      let m = endMonth - i;
      let y = endYear;
      while (m <= 0) {
        m += 12;
        y -= 1;
      }

      const mInfo = MONTHS_PT.find((item) => item.value === m);
      const labelShort = mInfo ? `${mInfo.short}/${String(y).slice(-2)}` : `${m}/${y}`;

      // Filter entries for month m and year y
      let overdueSum = 0;
      let toPaySum = 0;
      let paidSum = 0;
      let incomeSum = 0;

      entries.forEach((e) => {
        const dueParts = getMonthYearFromDateStr(e.dueDate);
        const isDueThisMonth = dueParts && dueParts.month === m && dueParts.year === y;

        if (e.status === 'Atrasado' && isDueThisMonth) {
          overdueSum += e.totalWithInterest;
        } else if (e.status === 'À Vencer' && isDueThisMonth) {
          toPaySum += e.totalWithInterest;
        } else if (e.status === 'Pago') {
          const payDateStr = e.paymentDate && e.paymentDate.trim() !== '' ? e.paymentDate : e.dueDate;
          const payParts = getMonthYearFromDateStr(payDateStr);
          if (payParts && payParts.month === m && payParts.year === y) {
            paidSum += e.totalWithInterest;
          }
        }
      });

      incomes.forEach((inc) => {
        const incParts = getMonthYearFromDateStr(inc.date);
        if (incParts && incParts.month === m && incParts.year === y) {
          incomeSum += inc.value;
        }
      });

      result.push({
        monthLabel: labelShort,
        'Entradas (Receitas)': Math.round(incomeSum * 100) / 100,
        'Total Pago (Despesas)': Math.round(paidSum * 100) / 100,
        'Total Atrasado': Math.round(overdueSum * 100) / 100,
        'Total À Vencer': Math.round(toPaySum * 100) / 100,
      });
    }

    return result;
  }, [entries, incomes, filterMode, selectedMonth, selectedYear, currentMonthNum, currentYearNum]);

  // CHART 2: Valor Gasto com os Funcionários
  const chartEmployeeExpensesData = useMemo(() => {
    const empEntries = filteredEntriesForPeriod.filter((e) => e.favorecidoType === 'Funcionário');

    const empMap: Record<string, { name: string; paid: number; pending: number; total: number }> = {};

    empEntries.forEach((e) => {
      const name = e.favorecidoName || 'Outro Funcionário';
      if (!empMap[name]) {
        empMap[name] = { name, paid: 0, pending: 0, total: 0 };
      }
      if (e.status === 'Pago') {
        empMap[name].paid += e.totalWithInterest;
      } else {
        empMap[name].pending += e.totalWithInterest;
      }
      empMap[name].total += e.totalWithInterest;
    });

    return Object.values(empMap)
      .map((item) => ({
        name: item.name,
        'Pago': Math.round(item.paid * 100) / 100,
        'Pendente': Math.round(item.pending * 100) / 100,
        total: Math.round(item.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredEntriesForPeriod]);

  const totalEmployeeExpense = useMemo(() => {
    return chartEmployeeExpensesData.reduce((acc, item) => acc + item.total, 0);
  }, [chartEmployeeExpensesData]);

  // CHART 3: Top 5 Fornecedores / Funcionários
  const chartTopEntitiesData = useMemo(() => {
    const sorted = [...entitySummaries]
      .filter((item) => item.valuePaid + item.balanceDue > 0)
      .sort((a, b) => (b.valuePaid + b.balanceDue) - (a.valuePaid + a.balanceDue))
      .slice(0, 5);

    return sorted.map((item) => ({
      name: item.name,
      type: item.type,
      total: Math.round((item.valuePaid + item.balanceDue) * 100) / 100,
      balanceDue: Math.round(item.balanceDue * 100) / 100,
      valuePaid: Math.round(item.valuePaid * 100) / 100,
    }));
  }, [entitySummaries]);

  // CHART 4: Entradas por Empresa (Volume de Receita no Período)
  const chartIncomesByCompanyData = useMemo(() => {
    const companyMap: Record<string, { companyName: string; total: number; count: number }> = {};

    filteredIncomesForPeriod.forEach((inc) => {
      const comp = inc.companyName.trim() || 'Outra Empresa';
      if (!companyMap[comp]) {
        companyMap[comp] = { companyName: comp, total: 0, count: 0 };
      }
      companyMap[comp].total += inc.value;
      companyMap[comp].count += 1;
    });

    return Object.values(companyMap)
      .map((item) => ({
        companyName: item.companyName,
        total: Math.round(item.total * 100) / 100,
        count: item.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredIncomesForPeriod]);

  // Year choices for dropdown
  const yearOptions = [2023, 2024, 2025, 2026, 2027, 2028, 2029];

  return (
    <div className="space-y-4">
      {/* 1. SELETOR DE MÊS / ANO & PERIOD INDICATOR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Controls Group */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Período:
            </span>

            {/* Dropdown 1: Mês */}
            <div className="flex items-center gap-1">
              <select
                value={filterMode === 'ALL' ? '' : selectedMonth}
                onChange={handleMonthChange}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5"
              >
                {filterMode === 'ALL' && <option value="">Selecione o Mês</option>}
                {MONTHS_PT.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropdown 2: Ano */}
            <div className="flex items-center gap-1">
              <select
                value={filterMode === 'ALL' ? '' : selectedYear}
                onChange={handleYearChange}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7.5 font-mono"
              >
                {filterMode === 'ALL' && <option value="">Ano</option>}
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Shortcut Button 1: Mês Atual */}
            <button
              onClick={handleSelectCurrentMonth}
              className={`px-3 py-1 rounded text-xs font-bold transition-all h-7.5 flex items-center gap-1 ${
                filterMode === 'MONTH' && selectedMonth === currentMonthNum && selectedYear === currentYearNum
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              title="Ir para o mês/ano atual"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Mês Atual</span>
            </button>

            {/* Shortcut Button 2: Resetar para Todos os Períodos */}
            <button
              onClick={handleResetToAll}
              className={`px-3 py-1 rounded text-xs font-bold transition-all h-7.5 flex items-center gap-1.5 ${
                filterMode === 'ALL'
                  ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
              title="Exibir dados consolidados de todos os meses e anos"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar para Todos os Períodos</span>
            </button>
          </div>

          {/* INDICADOR DO PERÍODO FILTRADO */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Filtro ativo:</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-extrabold tracking-tight">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Exibindo: <span className="font-mono">{periodLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CARDS DE RESUMO - DINÂMICOS POR MÊS (DESPESAS + ENTRADAS + SALDO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {/* Card 1 - Total Atrasado */}
        <div className="p-3 rounded-lg border bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/70 dark:border-rose-900/80 dark:text-rose-100 shadow-2xs flex items-center justify-between transition-all hover:border-rose-300">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              <span>Total Atrasado</span>
            </div>
            <div className="text-lg font-extrabold tracking-tight font-mono tabular-nums text-rose-900 dark:text-rose-100">
              {formatBRL(totalOverdue)}
            </div>
            <p className="text-[10px] font-medium text-rose-700 dark:text-rose-300">
              {countOverdue} {countOverdue === 1 ? 'pendência' : 'pendências'}
            </p>
          </div>
          <div className="p-2 rounded-md bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 text-sm font-bold">
            ⚠️
          </div>
        </div>

        {/* Card 2 - Total À Vencer */}
        <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-950 dark:bg-blue-950/70 dark:border-blue-900/80 dark:text-blue-100 shadow-2xs flex items-center justify-between transition-all hover:border-blue-300">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              <span>Total À Vencer</span>
            </div>
            <div className="text-lg font-extrabold tracking-tight font-mono tabular-nums text-blue-900 dark:text-blue-100">
              {formatBRL(totalToPay)}
            </div>
            <p className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
              {countToPay} {countToPay === 1 ? 'a pagar' : 'a pagar'}
            </p>
          </div>
          <div className="p-2 rounded-md bg-blue-200/80 dark:bg-blue-900/80 text-blue-800 dark:text-blue-200 text-sm font-bold">
            📅
          </div>
        </div>

        {/* Card 3 - Total Pago (Saídas) */}
        <div className="p-3 rounded-lg border bg-slate-100 border-slate-200 text-slate-900 dark:bg-slate-800/90 dark:border-slate-700 dark:text-slate-100 shadow-2xs flex items-center justify-between transition-all hover:border-slate-300">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <span>Total Pago (Saídas)</span>
            </div>
            <div className="text-lg font-extrabold tracking-tight font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatBRL(totalPaid)}
            </div>
            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
              {countPaid} {countPaid === 1 ? 'liquidado' : 'liquidados'}
            </p>
          </div>
          <div className="p-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold">
            💸
          </div>
        </div>

        {/* Card 4 - Total Entradas (Receitas) */}
        <div className="p-3 rounded-lg border-2 bg-emerald-50 border-emerald-500/60 text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-700/80 dark:text-emerald-100 shadow-2xs flex items-center justify-between transition-all hover:border-emerald-500">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Total Entradas</span>
            </div>
            <div className="text-lg font-extrabold tracking-tight font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatBRL(totalIncomesPeriod)}
            </div>
            <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
              {countIncomesPeriod} {countIncomesPeriod === 1 ? 'recebimento' : 'recebimentos'}
            </p>
          </div>
          <div className="p-2 rounded-md bg-emerald-200/90 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 text-sm font-bold shadow-2xs">
            💰
          </div>
        </div>

        {/* Card 5 - Saldo Líquido Operacional (Entradas - Saídas Pagas) */}
        <div
          className={`p-3 rounded-lg border flex items-center justify-between transition-all shadow-2xs ${
            netBalancePeriod >= 0
              ? 'bg-teal-50 border-teal-200 text-teal-950 dark:bg-teal-950/70 dark:border-teal-900/80 dark:text-teal-100'
              : 'bg-amber-50 border-amber-200 text-amber-950 dark:bg-amber-950/70 dark:border-amber-900/80 dark:text-amber-100'
          }`}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Wallet className="w-3 h-3" />
              <span>Saldo Operacional</span>
            </div>
            <div
              className={`text-lg font-extrabold tracking-tight font-mono tabular-nums ${
                netBalancePeriod >= 0
                  ? 'text-teal-700 dark:text-teal-300'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {formatBRL(netBalancePeriod)}
            </div>
            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 flex items-center gap-0.5">
              {netBalancePeriod >= 0 ? (
                <>
                  <ArrowUpRight className="w-3 h-3 text-teal-600" />
                  <span className="text-teal-700 dark:text-teal-300 font-semibold">Superávit no período</span>
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">Déficit no período</span>
                </>
              )}
            </p>
          </div>
          <div
            className={`p-2 rounded-md text-sm font-bold ${
              netBalancePeriod >= 0
                ? 'bg-teal-200/80 dark:bg-teal-900 text-teal-900 dark:text-teal-100'
                : 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
            }`}
          >
            {netBalancePeriod >= 0 ? '📊' : '⚖️'}
          </div>
        </div>
      </div>

      {/* 2.1 PAINEL DE RÁPIDA VISUALIZAÇÃO DE ENTRADAS (RECEITAS) */}
      <div className="bg-white dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-800/80 rounded-lg shadow-2xs overflow-hidden">
        <div className="p-2.5 sm:p-3 border-b border-emerald-200 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-50/60 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-emerald-600 text-white">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-2">
                Rápida Visualização de Entradas (Receitas) - {periodLabel}
              </h2>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                Lançamentos de entrada informados com reflexo imediato no fluxo de caixa ({filteredIncomesForPeriod.length} registros).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
              Total Recebido:{' '}
              <span className="font-mono text-emerald-700 dark:text-emerald-300 font-extrabold">
                {formatBRL(totalIncomesPeriod)}
              </span>
            </span>
          </div>
        </div>

        {/* Mobile Incomes Card List */}
        <div className="sm:hidden divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {filteredIncomesForPeriod.length === 0 ? (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs px-4">
              Nenhuma entrada registrada para o período <span className="font-semibold">{periodLabel}</span>.
            </div>
          ) : (
            filteredIncomesForPeriod.map((inc) => (
              <div key={`dash-inc-m-${inc.id}`} className="p-3 space-y-1 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{inc.companyName}</span>
                  </div>
                  <span className="font-mono font-extrabold text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                    {formatBRL(inc.value)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>#{inc.id} &bull; {inc.date.includes('-') ? inc.date.split('-').reverse().join('/') : inc.date}</span>
                  {inc.description && <span className="italic font-sans text-slate-600 dark:text-slate-300 truncate max-w-[160px]">{inc.description}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Incomes Table (Desktop & Tablet) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-950 dark:text-emerald-200 font-bold border-b border-emerald-200 dark:border-emerald-800 text-[11px]">
                <th className="py-2 px-3 w-12 font-mono text-center">ID</th>
                <th className="py-2 px-3">Nome da Empresa / Cliente</th>
                <th className="py-2 px-3">Data do Recebimento</th>
                <th className="py-2 px-3">Descrição / Detalhes</th>
                <th className="py-2 px-3 text-right font-mono">Valor da Entrada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 text-[11px] font-mono tabular-nums">
              {filteredIncomesForPeriod.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400 font-sans">
                    Nenhuma entrada registrada para o período <span className="font-semibold">{periodLabel}</span>.
                  </td>
                </tr>
              ) : (
                filteredIncomesForPeriod.map((inc) => (
                  <tr key={inc.id} className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
                    <td className="py-1.5 px-3 font-mono text-slate-400 text-center text-[10px]">#{inc.id}</td>
                    <td className="py-1.5 px-3 font-sans font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{inc.companyName}</span>
                      </div>
                    </td>
                    <td className="py-1.5 px-3 text-slate-800 dark:text-slate-200">
                      {inc.date.includes('-')
                        ? inc.date.split('-').reverse().join('/')
                        : inc.date}
                    </td>
                    <td className="py-1.5 px-3 font-sans text-slate-600 dark:text-slate-400">
                      {inc.description || '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatBRL(inc.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredIncomesForPeriod.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-bold border-t border-emerald-200 dark:border-emerald-800 text-xs">
                  <td colSpan={4} className="py-2 px-3 text-right text-emerald-950 dark:text-emerald-200 font-sans uppercase">
                    Total de Entradas em {periodLabel}:
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-300">
                    {formatBRL(totalIncomesPeriod)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 3. TABELA DE RESUMO POR FORNECEDOR / FUNCIONÁRIO - FILTRADA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-2.5 sm:p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-800/40">
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wider">
              <CircleDollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Resumo por Favorecido ({periodLabel})
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Valores calculados estritamente para os lançamentos do período <span className="font-semibold">{periodLabel}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Entity Type */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded border border-slate-300/80 dark:border-slate-700 text-[11px] font-medium">
              <button
                onClick={() => setFilterType('Todos')}
                className={`px-2 py-0.5 rounded transition-all ${
                  filterType === 'Todos'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('Fornecedor')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
                  filterType === 'Fornecedor'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Truck className="w-3 h-3 text-slate-500" /> Fornecedores
              </button>
              <button
                onClick={() => setFilterType('Funcionário')}
                className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
                  filterType === 'Funcionário'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3 h-3 text-blue-500" /> Funcionários
              </button>
            </div>

            {/* Search input */}
            <div className="relative w-full sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar favorecido..."
                className="w-full pl-7 pr-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none h-7"
              />
            </div>
          </div>
        </div>

        {/* Mobile Favorecidos Summary Cards */}
        <div className="sm:hidden divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
          {filteredSummaries.length === 0 ? (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs px-4">
              Nenhum favorecido com lançamentos em <span className="font-semibold">{periodLabel}</span>.
            </div>
          ) : (
            filteredSummaries.map((item, idx) => {
              const isSupplier = item.type === 'Fornecedor';
              const hasBalance = item.balanceDue > 0;

              return (
                <div key={`dash-fav-m-${item.type}-${item.name}-${idx}`} className="p-3 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-white block">{item.name}</span>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.25 rounded text-[10px] font-semibold ${
                          isSupplier
                            ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {isSupplier ? 'Fornecedor' : (item.paymentType || 'Funcionário')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Saldo Devedor</span>
                      <span
                        className={`font-mono font-extrabold text-xs ${
                          hasBalance
                            ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {formatBRL(item.balanceDue)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[10px] pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded text-center border border-emerald-200/60 dark:border-emerald-900/60">
                      <span className="text-emerald-800 dark:text-emerald-300 block font-semibold">Pago ({item.countPaid})</span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatBRL(item.valuePaid)}</span>
                    </div>

                    <div className="bg-rose-50 dark:bg-rose-950/40 p-1.5 rounded text-center border border-rose-200/60 dark:border-rose-900/60">
                      <span className="text-rose-800 dark:text-rose-300 block font-semibold">Atraso ({item.countOverdue})</span>
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400">{formatBRL(item.valueOverdue)}</span>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/40 p-1.5 rounded text-center border border-blue-200/60 dark:border-blue-900/60">
                      <span className="text-blue-800 dark:text-blue-300 block font-semibold">À Vencer ({item.countToPay})</span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{formatBRL(item.valueToPay)}</span>
                    </div>
                  </div>

                  {item.accumulatedInterest > 0 && (
                    <div className="flex items-center justify-between text-[10px] text-rose-600 dark:text-rose-400 font-mono">
                      <span>Juros acumulados:</span>
                      <span className="font-bold">{formatBRL(item.accumulatedInterest)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {filteredSummaries.length > 0 && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-bold text-xs">
              <span className="text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">
                Saldo Total Devedor:
              </span>
              <span className="font-mono font-extrabold text-amber-700 dark:text-amber-400 text-sm">
                {formatBRL(filteredSummaries.reduce((sum, i) => sum + i.balanceDue, 0))}
              </span>
            </div>
          )}
        </div>

        {/* Summary Table (Desktop & Tablet) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 select-none text-[11px]">
                <th
                  onClick={() => handleSort('name')}
                  className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center gap-1">
                    <span>Nome</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('type')}
                  className="py-2 px-2.5 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center gap-1">
                    <span>Tipo</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2 text-center">Qt Pago</th>
                <th
                  onClick={() => handleSort('valuePaid')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Pago</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2 text-center">Qt Atraso</th>
                <th
                  onClick={() => handleSort('valueOverdue')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Atrasado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-2 px-2 text-center">Qt Vencer</th>
                <th
                  onClick={() => handleSort('valueToPay')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor À Vencer</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('balanceDue')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-extrabold"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Saldo Devedor</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('accumulatedInterest')}
                  className="py-2 px-2.5 text-right cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Juros Acum.</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800 font-mono text-[11px] tabular-nums">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-500 dark:text-slate-400 font-sans">
                    Nenhum favorecido com lançamentos em <span className="font-semibold">{periodLabel}</span>.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((item, idx) => {
                  const isSupplier = item.type === 'Fornecedor';
                  const rowBg = isSupplier
                    ? 'bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-800/70'
                    : 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-100/40 dark:hover:bg-blue-900/30';

                  const hasBalance = item.balanceDue > 0;

                  return (
                    <tr key={`${item.type}-${item.name}-${idx}`} className={`transition-colors ${rowBg}`}>
                      {/* Nome */}
                      <td className="py-1.5 px-2.5 font-sans font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {item.name}
                      </td>

                      {/* Tipo */}
                      <td className="py-1.5 px-2.5 font-sans">
                        <span
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.25 rounded text-[10px] font-semibold ${
                            isSupplier
                              ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                              : 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
                          }`}
                        >
                          {isSupplier ? 'Fornecedor' : (item.paymentType || 'Pagamento')}
                        </span>
                      </td>

                      {/* Qt Pago */}
                      <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-300">
                        {item.countPaid}
                      </td>

                      {/* Valor Pago */}
                      <td className="py-1.5 px-2.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
                        {formatBRL(item.valuePaid)}
                      </td>

                      {/* Qt Atrasado */}
                      <td className="py-1.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                        {item.countOverdue > 0 ? item.countOverdue : 0}
                      </td>

                      {/* Valor Atrasado */}
                      <td className="py-1.5 px-2.5 text-right font-medium text-rose-700 dark:text-rose-400">
                        {item.valueOverdue > 0 ? formatBRL(item.valueOverdue) : 'R$ 0,00'}
                      </td>

                      {/* Qt À Vencer */}
                      <td className="py-1.5 px-2 text-center text-slate-600 dark:text-slate-300">
                        {item.countToPay}
                      </td>

                      {/* Valor À Vencer */}
                      <td className="py-1.5 px-2.5 text-right font-medium text-blue-700 dark:text-blue-400">
                        {item.valueToPay > 0 ? formatBRL(item.valueToPay) : 'R$ 0,00'}
                      </td>

                      {/* Saldo Devedor */}
                      <td
                        className={`py-1.5 px-2.5 text-right font-bold ${
                          hasBalance
                            ? 'bg-amber-100/80 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {formatBRL(item.balanceDue)}
                      </td>

                      {/* Juros Acumulados */}
                      <td className="py-1.5 px-2.5 text-right text-slate-700 dark:text-slate-300">
                        {item.accumulatedInterest > 0 ? formatBRL(item.accumulatedInterest) : 'R$ 0,00'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Totals Footer */}
            {filteredSummaries.length > 0 && (
              <tfoot>
                <tr className="bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold text-[11px] tabular-nums border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={2} className="py-2 px-2.5 font-sans uppercase text-[11px] font-extrabold">
                    Totais do Resumo ({periodLabel})
                  </td>
                  <td className="py-2 px-2 text-center">
                    {filteredSummaries.reduce((sum, i) => sum + i.countPaid, 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-700 dark:text-emerald-400">
                    {formatBRL(filteredSummaries.reduce((sum, i) => sum + i.valuePaid, 0))}
                  </td>
                  <td className="py-2 px-2 text-center text-rose-600 dark:text-rose-400">
                    {filteredSummaries.reduce((sum, i) => sum + i.countOverdue, 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-rose-700 dark:text-rose-400">
                    {formatBRL(filteredSummaries.reduce((sum, i) => sum + i.valueOverdue, 0))}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {filteredSummaries.reduce((sum, i) => sum + i.countToPay, 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-blue-700 dark:text-blue-400">
                    {formatBRL(filteredSummaries.reduce((sum, i) => sum + i.valueToPay, 0))}
                  </td>
                  <td className="py-2 px-2.5 text-right bg-amber-200/90 dark:bg-amber-900 text-amber-950 dark:text-amber-100 font-extrabold text-xs">
                    {formatBRL(filteredSummaries.reduce((sum, i) => sum + i.balanceDue, 0))}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-800 dark:text-slate-200">
                    {formatBRL(filteredSummaries.reduce((sum, i) => sum + i.accumulatedInterest, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 4. GRÁFICOS INTERATIVOS (CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CHART 1: Evolução por Mês (últimos 6 meses) - Entradas vs Saídas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Evolução por Mês: Entradas (Receitas) vs Contas Pagas & Pendências
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Valores em R$ (Histórico de 6 meses)</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartEvolucaoData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Entradas (Receitas)" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Pago (Despesas)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Atrasado" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total À Vencer" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 4: Entradas por Empresa (Volume de Receita no Período) */}
        <div className="bg-white dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-800/80 rounded-lg p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200 dark:border-emerald-800/80 pb-2">
            <h3 className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Entradas por Empresa / Cliente ({periodLabel})
            </h3>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
              Total: {formatBRL(totalIncomesPeriod)}
            </span>
          </div>

          {chartIncomesByCompanyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              Nenhuma entrada registrada para o período selecionado.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartIncomesByCompanyData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="companyName" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), 'Valor Recebido']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" fill="#059669" radius={[0, 4, 4, 0]}>
                    {chartIncomesByCompanyData.map((_, index) => (
                      <Cell
                        key={`income-cell-${index}`}
                        fill={index === 0 ? '#047857' : index === 1 ? '#059669' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 2: Valor Gasto com os Funcionários */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Valor Gasto com Funcionários ({periodLabel})
            </h3>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-bold">
              Total: {formatBRL(totalEmployeeExpense)}
            </span>
          </div>

          {chartEmployeeExpensesData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              Nenhum gasto com funcionário registrado no período selecionado.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartEmployeeExpensesData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `R$${val}`}
                  />
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), '']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  <Bar dataKey="Pago" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Pendente" fill="#3b82f6" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* CHART 3: Top 5 Fornecedores/Funcionários por Valor Total */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 shadow-2xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              Top 5 Favorecidos (Despesas) - {periodLabel}
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Por Volume Total em R$</span>
          </div>

          {chartTopEntitiesData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-500">
              Nenhum favorecido com saldo no período.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartTopEntitiesData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    formatter={(val: unknown) => [formatBRL(Number(val) || 0), 'Total']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      color: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {chartTopEntitiesData.map((item, index) => (
                      <Cell
                        key={`top-cell-${index}`}
                        fill={item.type === 'Fornecedor' ? '#6366f1' : '#0ea5e9'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

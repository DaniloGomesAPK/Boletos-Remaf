import React, { useState, useMemo } from 'react';
import { CalculatedEntry } from '../types';
import { formatBRL, parseBRDate, getTodayDateString } from '../utils/calculations';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Building2,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Receipt,
  Layers,
  TrendingDown,
} from 'lucide-react';

export interface StatusDetailsViewProps {
  entries: CalculatedEntry[];
  type: 'overdue' | 'to-pay';
  onBack: () => void;
}

export const StatusDetailsView: React.FC<StatusDetailsViewProps> = ({
  entries,
  type,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [subFilter, setSubFilter] = useState<'all' | 'period1' | 'period2'>('all');

  const todayStr = useMemo(() => getTodayDateString(), []);

  // Helper para cálculo dos dias de diferença em relação a hoje
  const getDaysDiff = (dueDateStr: string, currentDayStr: string) => {
    try {
      const [dYear, dMonth, dDay] = dueDateStr.split('-').map(Number);
      const [tYear, tMonth, tDay] = currentDayStr.split('-').map(Number);
      const due = new Date(dYear, dMonth - 1, dDay);
      const cur = new Date(tYear, tMonth - 1, tDay);
      const diffMs = due.getTime() - cur.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  // 1. Filtrar estritamente por status
  const targetEntries = useMemo(() => {
    return entries
      .filter((e) => {
        if (type === 'overdue') {
          return e.status === 'Atrasado';
        } else {
          return e.status === 'À Vencer';
        }
      })
      .sort((a, b) => {
        // Para atrasados: ordenar pelos mais antigos ou maior valor
        if (type === 'overdue') {
          if (a.dueDate !== b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate); // mais atrasados primeiro
          }
          return (b.totalWithInterest || 0) - (a.totalWithInterest || 0);
        } else {
          // Para à vencer: cronológico ascendente (vencimentos mais próximos primeiro)
          if (a.dueDate !== b.dueDate) {
            return a.dueDate.localeCompare(b.dueDate);
          }
          return (b.totalWithInterest || 0) - (a.totalWithInterest || 0);
        }
      });
  }, [entries, type]);

  // Cálculos de Resumo Financeiro
  const totalAmount = useMemo(() => {
    return targetEntries.reduce((sum, e) => sum + (e.totalWithInterest || 0), 0);
  }, [targetEntries]);

  const totalCount = targetEntries.length;

  // Métricas específicas para Atrasado
  const totalInterest = useMemo(() => {
    return targetEntries.reduce((sum, e) => sum + (e.interestValue || 0), 0);
  }, [targetEntries]);

  const countOverdueUpTo30Days = useMemo(() => {
    return targetEntries.filter((e) => {
      const days = e.daysOverdue || Math.abs(getDaysDiff(e.dueDate, todayStr));
      return days <= 30;
    }).length;
  }, [targetEntries, todayStr]);

  const countOverdueMoreThan30Days = useMemo(() => {
    return targetEntries.filter((e) => {
      const days = e.daysOverdue || Math.abs(getDaysDiff(e.dueDate, todayStr));
      return days > 30;
    }).length;
  }, [targetEntries, todayStr]);

  // Métricas específicas para À Vencer
  const todayDueEntries = useMemo(() => {
    return targetEntries.filter((e) => e.dueDate === todayStr);
  }, [targetEntries, todayStr]);

  const next7DaysEntries = useMemo(() => {
    return targetEntries.filter((e) => {
      const days = getDaysDiff(e.dueDate, todayStr);
      return days >= 0 && days <= 7;
    });
  }, [targetEntries, todayStr]);

  const totalNext7Days = useMemo(() => {
    return next7DaysEntries.reduce((sum, e) => sum + (e.totalWithInterest || 0), 0);
  }, [next7DaysEntries]);

  // Filtragem de busca e subfiltros
  const filteredEntries = useMemo(() => {
    return targetEntries.filter((e) => {
      // Subfiltro
      if (type === 'overdue') {
        const days = e.daysOverdue || Math.abs(getDaysDiff(e.dueDate, todayStr));
        if (subFilter === 'period1' && days > 30) return false;
        if (subFilter === 'period2' && days <= 30) return false;
      } else {
        const days = getDaysDiff(e.dueDate, todayStr);
        if (subFilter === 'period1' && days !== 0) return false; // Vencem Hoje
        if (subFilter === 'period2' && (days < 0 || days > 7)) return false; // Próximos 7 dias
      }

      // Busca textual
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const favName = (e.favorecidoName || '').toLowerCase();
      const docType = (e.docType || '').toLowerCase();
      const nfNum = (e.nfNumber || '').toLowerCase();
      const dateBr = parseBRDate(e.dueDate).toLowerCase();

      return (
        favName.includes(term) ||
        docType.includes(term) ||
        nfNum.includes(term) ||
        dateBr.includes(term)
      );
    });
  }, [targetEntries, type, subFilter, searchTerm, todayStr]);

  const isOverdue = type === 'overdue';

  return (
    <div className="space-y-5 animate-in fade-in duration-200 w-full">
      {/* Barra Superior de Navegação */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          id={isOverdue ? 'btn-voltar-dashboard-atrasados' : 'btn-voltar-dashboard-a-vencer'}
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-lg text-black dark:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs transition-all cursor-pointer hover:translate-x-[-2px]"
        >
          <ArrowLeft className="w-4 h-4 text-black dark:text-blue-400" />
          <span>← Voltar para Dashboard</span>
        </button>

        <div className="text-xs text-black dark:text-slate-300 hidden sm:flex items-center gap-1.5 font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Atualizado em tempo real</span>
        </div>
      </div>

      {/* Cabeçalho Executivo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`p-2.5 rounded-xl border ${
                  isOverdue
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50'
                    : 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                }`}
              >
                {isOverdue ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Calendar className="w-5 h-5" />
                )}
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-black dark:text-white">
                  {isOverdue ? 'Total Atrasado' : 'Total À Vencer'}
                </h1>
                <p className="text-xs sm:text-sm text-black dark:text-slate-200 mt-0.5 font-medium">
                  {isOverdue
                    ? 'Contas com status vencido/atrasado pendentes de pagamento'
                    : 'Contas programadas com status À Vencer aguardando quitação'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black uppercase tracking-wider ${
                isOverdue
                  ? 'bg-rose-100 text-black dark:bg-rose-950/80 dark:text-rose-200 border-2 border-rose-300 dark:border-rose-800'
                  : 'bg-blue-100 text-black dark:bg-blue-950/80 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-800'
              }`}
            >
              {isOverdue ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-black dark:text-rose-400" />
                  Status: Atrasado
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-black dark:text-blue-400" />
                  Status: À Vencer
                </>
              )}
            </span>
          </div>
        </div>

        {/* Resumo Financeiro com 3 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          {/* KPI 1: Montante Financeiro Total */}
          <div
            className={`p-4 rounded-xl border ${
              isOverdue
                ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                : 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider text-black dark:text-slate-200"
              >
                {isOverdue ? 'Total em Atraso' : 'Total a Vencer'}
              </span>
              <DollarSign
                className={`w-4 h-4 ${
                  isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
                }`}
              />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-black dark:text-white mt-1 tabular-nums">
              {formatBRL(totalAmount)}
            </div>
            <p className="text-[11px] text-black dark:text-slate-300 mt-1 font-medium">
              {isOverdue
                ? 'Montante consolidado com encargos e juros previstos'
                : 'Montante total de compromissos programados'}
            </p>
          </div>

          {/* KPI 2: Quantidade de Contas */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Quantidade de contas
              </span>
              <Receipt className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 mt-1 tabular-nums">
              {totalCount}
            </div>
            <p className="text-[11px] text-slate-700 mt-1 font-medium">
              {isOverdue
                ? `${totalCount === 1 ? '1 conta em atraso' : `${totalCount} contas em atraso`}`
                : `${totalCount === 1 ? '1 conta programada' : `${totalCount} contas programadas`}`}
            </p>
          </div>

          {/* KPI 3: Indicador Auxiliar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 dark:border-slate-700/80 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {isOverdue ? 'Juros Acumulados' : 'Próximos 7 Dias'}
              </span>
              {isOverdue ? (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              ) : (
                <Clock className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 mt-1 tabular-nums">
              {isOverdue ? formatBRL(totalInterest) : formatBRL(totalNext7Days)}
            </div>
            <p className="text-[11px] text-slate-700 mt-1 font-medium">
              {isOverdue
                ? 'Valor acumulado por dias de atraso'
                : `${next7DaysEntries.length} ${next7DaysEntries.length === 1 ? 'conta na próxima semana' : 'contas na próxima semana'}`}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black dark:text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por fornecedor, documento ou data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-black dark:text-white placeholder:text-slate-500 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtros rápidos */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setSubFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subFilter === 'all'
                ? isOverdue
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todas ({targetEntries.length})
          </button>

          {isOverdue ? (
            <>
              <button
                type="button"
                onClick={() => setSubFilter('period1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subFilter === 'period1'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Até 30 dias ({countOverdueUpTo30Days})
              </button>
              <button
                type="button"
                onClick={() => setSubFilter('period2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subFilter === 'period2'
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                + de 30 dias ({countOverdueMoreThan30Days})
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSubFilter('period1')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subFilter === 'period1'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Hoje ({todayDueEntries.length})
              </button>
              <button
                type="button"
                onClick={() => setSubFilter('period2')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subFilter === 'period2'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                Próximos 7 dias ({next7DaysEntries.length})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid de Cards dos Lançamentos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
            <Layers
              className={`w-4 h-4 ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}
            />
            <span>{isOverdue ? 'Contas em Atraso' : 'Contas Programadas a Vencer'}</span>
          </h2>
          <span className="text-xs text-black dark:text-slate-200 font-bold">
            Exibindo {filteredEntries.length} de {targetEntries.length} contas
          </span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60">
            <div className="inline-flex p-3 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mb-3">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {targetEntries.length === 0
                ? isOverdue
                  ? 'Nenhuma conta atrasada no momento'
                  : 'Nenhuma conta à vencer programada'
                : 'Nenhum lançamento encontrado com o filtro aplicado'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {targetEntries.length === 0
                ? isOverdue
                  ? 'Parabéns! Todos os compromissos financeiros estão rigorosamente em dia.'
                  : 'Não há contas com status À Vencer cadastradas.'
                : 'Tente alterar os termos da busca ou selecione outro filtro rápido.'}
            </p>
            {targetEntries.length === 0 && (
              <button
                type="button"
                onClick={onBack}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                Voltar para o Dashboard
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredEntries.map((entry) => {
              const diffDays = getDaysDiff(entry.dueDate, todayStr);
              const daysOverdue = entry.daysOverdue || Math.abs(diffDays);
              const isToday = diffDays === 0;

              // 1. Fornecedor: Nome real
              const fornecedorNome = entry.favorecidoName || 'Fornecedor não informado';

              // 2. Documento: Tipo do documento com NF
              const tipoDocumento = entry.docType || 'Outros';
              const documentoTexto = entry.nfNumber
                ? `${tipoDocumento} • Nº ${entry.nfNumber}`
                : tipoDocumento;

              // 3. Data de vencimento
              const dataVencimento = entry.dueDate ? parseBRDate(entry.dueDate) : '-';

              // 4. Valor: entry.totalWithInterest
              const valorFormatado = formatBRL(entry.totalWithInterest);

              // 5. Status text & badge
              let statusLabel = '';
              let badgeClasses = '';

              if (isOverdue) {
                statusLabel = `Atrasado (${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'})`;
                badgeClasses = 'bg-rose-100 text-black border-2 border-rose-300 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800';
              } else {
                if (isToday) {
                  statusLabel = 'Vence hoje';
                  badgeClasses = 'bg-rose-100 text-black border-2 border-rose-300 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800 animate-pulse';
                } else if (diffDays === 1) {
                  statusLabel = 'Vence amanhã';
                  badgeClasses = 'bg-amber-100 text-black border-2 border-amber-300 dark:bg-amber-950/90 dark:text-amber-200 dark:border-amber-800';
                } else {
                  statusLabel = `Em ${diffDays} dias`;
                  badgeClasses = 'bg-blue-50 text-black border-2 border-blue-200 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-900/60';
                }
              }

              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl border transition-all hover:shadow-md bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 ${
                    isOverdue
                      ? 'border-rose-200 dark:border-rose-900/60 hover:border-rose-300'
                      : isToday
                      ? 'border-rose-300 dark:border-rose-900/60 shadow-xs shadow-rose-100/50 dark:shadow-none bg-gradient-to-br from-rose-50/20 via-white to-white dark:from-rose-950/10 dark:via-slate-900 dark:to-slate-900'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Topo do Card: Fornecedor e Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : isToday
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-black dark:text-slate-300 block">
                          Fornecedor
                        </span>
                        <h3
                          className="font-black text-sm sm:text-base text-black dark:text-white truncate"
                          title={fornecedorNome}
                        >
                          {fornecedorNome}
                        </h3>
                      </div>
                    </div>

                    {/* Badge de Status */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 border ${badgeClasses}`}
                    >
                      {(isOverdue || isToday) && <AlertCircle className="w-3 h-3 text-black dark:text-rose-300" />}
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Informações Centrais: Bloco Branco de Alto Contraste (Documento e Vencimento) */}
                  <div className="grid grid-cols-2 gap-2 py-2.5 px-3 rounded-lg bg-white border border-slate-300 text-xs shadow-2xs">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-black block">
                        Documento
                      </span>
                      <div className="flex items-center gap-1.5 text-black font-bold text-xs mt-0.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-black shrink-0" />
                        <span className="truncate text-black" title={documentoTexto}>
                          {documentoTexto}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-black block">
                        Data de Vencimento
                      </span>
                      <div className="flex items-center gap-1.5 text-black font-bold text-xs mt-0.5 min-w-0">
                        <Calendar className="w-3.5 h-3.5 text-black shrink-0" />
                        <span className="truncate text-black">{dataVencimento}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Card: Valor */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-black dark:text-slate-300 block">
                        Valor {isOverdue && entry.interestValue > 0 ? 'com Juros' : ''}
                      </span>
                      <span
                        className="text-lg sm:text-xl font-black font-mono tracking-tight tabular-nums text-black dark:text-white"
                      >
                        {valorFormatado}
                      </span>
                    </div>

                    {isOverdue ? (
                      entry.interestValue > 0 ? (
                        <span className="text-[11px] font-bold text-black dark:text-rose-300">
                          + {formatBRL(entry.interestValue)} juros
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-black dark:text-slate-300">
                          Sem juros adicionais
                        </span>
                      )
                    ) : (
                      diffDays > 0 && (
                        <span className="text-[11px] font-bold text-black dark:text-blue-300">
                          {diffDays === 1 ? 'Vence amanhã' : `Vence em ${diffDays} dias`}
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

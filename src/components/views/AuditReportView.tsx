import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  CalendarOff,
  ShieldAlert,
} from 'lucide-react';
import { ChartConfig, ColumnMeta, Dataset, DataRow } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { CuratedDataTable } from '../common/CuratedDataTable';

interface AuditReportViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  onSelectRow: (row: DataRow) => void;
  onChartElementClick?: (columnKey: string, value: string) => void;
  onOpenColumnSelection?: () => void;
}

type AuditFilterTab =
  | 'all_anomalies'
  | 'active_missing_start'
  | 'done_missing_any'
  | 'done_missing_start_only'
  | 'done_missing_due_only'
  | 'done_missing_both';

export const AuditReportView: React.FC<AuditReportViewProps> = ({
  dataset,
  filteredRows,
  columnMetaMap,
  onSelectRow,
  onChartElementClick,
  onOpenColumnSelection,
}) => {
  const [activeTab, setActiveTab] = useState<AuditFilterTab>('all_anomalies');

  const statusCol = dataset.jiraFields?.statusCol || '';
  const typeCol = dataset.jiraFields?.typeCol || '';
  const startDateCol = dataset.jiraFields?.startDateCol || '';
  const dueCol = dataset.jiraFields?.dueCol || '';
  const hasParentKeyCol = columnMetaMap.has('Üst anahtar');

  const missingRequiredCols: string[] = [];
  if (!statusCol || !columnMetaMap.has(statusCol)) missingRequiredCols.push('Durum');
  if (!startDateCol || !columnMetaMap.has(startDateCol)) missingRequiredCols.push('Başlangıç tarihi');
  if (!dueCol || !columnMetaMap.has(dueCol)) missingRequiredCols.push('Bitiş tarihi');

  // Alt görevleri ve İptal edilen kayıtları inceleme kapsamından hariç tut
  const { eligibleRows, excludedSubtaskCount, excludedCancelledCount } = useMemo(() => {
    if (missingRequiredCols.length > 0) {
      return { eligibleRows: [], excludedSubtaskCount: 0, excludedCancelledCount: 0 };
    }
    let subtasks = 0;
    let cancelled = 0;
    const rows = filteredRows.filter(row => {
      const typeVal = typeCol && columnMetaMap.has(typeCol) ? String(row[typeCol] || '').trim().toLowerCase() : '';
      const parentKeyVal = hasParentKeyCol ? String(row['Üst anahtar'] || '').trim() : '';
      const isSubtask =
        typeVal.includes('alt görev') ||
        typeVal.includes('sub-task') ||
        typeVal.includes('subtask') ||
        Boolean(parentKeyVal);

      if (isSubtask) {
        subtasks++;
        return false;
      }

      const rawStatus = String(row[statusCol] || '').trim().toLowerCase();
      const bucket = columnMetaMap.has('_derived_status_bucket') ? String(row['_derived_status_bucket'] || '') : '';
      const isCancelled =
        bucket === 'İptal Edildi' ||
        rawStatus.includes('iptal') ||
        rawStatus.includes('cancel') ||
        rawStatus.includes('rejected');

      if (isCancelled) {
        cancelled++;
        return false;
      }

      return true;
    });

    return {
      eligibleRows: rows,
      excludedSubtaskCount: subtasks,
      excludedCancelledCount: cancelled,
    };
  }, [filteredRows, typeCol, statusCol, hasParentKeyCol, columnMetaMap, missingRequiredCols.length]);

  const auditStats = useMemo(() => {
    const activeMissingStart: DataRow[] = [];
    const doneMissingAny: DataRow[] = [];
    const doneMissingStartOnly: DataRow[] = [];
    const doneMissingDueOnly: DataRow[] = [];
    const doneMissingBoth: DataRow[] = [];
    const allAnomalies: DataRow[] = [];

    eligibleRows.forEach(row => {
      const rawStatus = String(row[statusCol] || '').trim().toLowerCase();
      const bucket = String(row['_derived_status_bucket'] || '');

      const isDone =
        bucket === 'Tamamlandı' ||
        rawStatus.includes('tamam') ||
        rawStatus.includes('bitti') ||
        rawStatus.includes('done') ||
        rawStatus.includes('closed') ||
        rawStatus.includes('çözüldü');

      const hasStart = Boolean(String(row[startDateCol] || '').trim());
      const hasDue = Boolean(String(row[dueCol] || '').trim());

      let isAnomaly = false;

      // Kural 1: Tamamlandı haricindeki diğer aktif görevlerde Başlangıç Tarihi boş olanlar
      if (!isDone && !hasStart) {
        activeMissingStart.push(row);
        isAnomaly = true;
      }

      // Kural 2: Durumu Tamamlandı olup Başlangıç ve/veya Bitiş Tarihi boş olanlar
      if (isDone && (!hasStart || !hasDue)) {
        doneMissingAny.push(row);
        if (!hasStart && !hasDue) {
          doneMissingBoth.push(row);
        } else if (!hasStart) {
          doneMissingStartOnly.push(row);
        } else if (!hasDue) {
          doneMissingDueOnly.push(row);
        }
        isAnomaly = true;
      }

      if (isAnomaly) {
        allAnomalies.push(row);
      }
    });

    const total = eligibleRows.length;
    const compliantCount = total - allAnomalies.length;
    const complianceRate = total > 0 ? Math.round((compliantCount / total) * 1000) / 10 : 100;

    return {
      activeMissingStart,
      doneMissingAny,
      doneMissingStartOnly,
      doneMissingDueOnly,
      doneMissingBoth,
      allAnomalies,
      compliantCount,
      complianceRate,
    };
  }, [eligibleRows, statusCol, startDateCol, dueCol]);

  const displayedRows = useMemo(() => {
    switch (activeTab) {
      case 'active_missing_start':
        return auditStats.activeMissingStart;
      case 'done_missing_any':
        return auditStats.doneMissingAny;
      case 'done_missing_start_only':
        return auditStats.doneMissingStartOnly;
      case 'done_missing_due_only':
        return auditStats.doneMissingDueOnly;
      case 'done_missing_both':
        return auditStats.doneMissingBoth;
      default:
        return auditStats.allAnomalies;
    }
  }, [activeTab, auditStats]);

  const candidateAuditCharts: ChartConfig[] = [
    {
      id: 'audit_status_dist',
      title: 'Eksik Tarihli Kayıtların Durum Dağılımı',
      type: 'donut',
      xAxisCol: statusCol,
      aggregation: 'count',
      colorPalette: 'warm',
    },
    {
      id: 'audit_dept_dist',
      title: 'Departman Bazlı Eksik Tarih Yoğunluğu',
      type: 'bar_horizontal',
      xAxisCol: dataset.jiraFields?.departmentCol || '',
      groupByCol: statusCol,
      stackedSeries: true,
      aggregation: 'count',
      colorPalette: 'technical',
      sortBy: 'value_desc',
      topN: 10,
    },
  ];

  const auditCharts = candidateAuditCharts.filter(
    cfg => cfg.xAxisCol && columnMetaMap.has(cfg.xAxisCol) && (!cfg.groupByCol || columnMetaMap.has(cfg.groupByCol))
  );

  if (missingRequiredCols.length > 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 font-mono">
        <div className="w-14 h-14 rounded-md bg-amber-950/30 border border-amber-500/35 flex items-center justify-center text-amber-400">
          <CalendarOff className="w-7 h-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-sm font-bold text-white">
            Tarih Eksiklik Analizi İçin Gerekli Ana Alanlar Tanımlı Değil
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Bu raporun çalışabilmesi için şu ana filtre alanlarının atanmış ve seçili olması gerekir:{' '}
            <span className="text-amber-300 font-semibold">{missingRequiredCols.join(', ')}</span>.
          </p>
        </div>
        {onOpenColumnSelection && (
          <button
            onClick={onOpenColumnSelection}
            className="px-4 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-semibold text-cyan-300 transition-colors"
          >
            Ana Alan Eşleştirmesini Aç
          </button>
        )}
      </div>
    );
  }

  const tabs: { id: AuditFilterTab; label: string; count: number; accent: string }[] = [
    {
      id: 'all_anomalies',
      label: 'Tümü (Kural 1 + Kural 2)',
      count: auditStats.allAnomalies.length,
      accent: 'cyan',
    },
    {
      id: 'active_missing_start',
      label: 'Aktiflerde Başlangıç Tarihi Boş',
      count: auditStats.activeMissingStart.length,
      accent: 'amber',
    },
    {
      id: 'done_missing_any',
      label: 'Tamamlananlarda Başlangıç/Bitiş Boş',
      count: auditStats.doneMissingAny.length,
      accent: 'rose',
    },
    {
      id: 'done_missing_start_only',
      label: 'Tamamlandı: Sadece Başlangıç Boş',
      count: auditStats.doneMissingStartOnly.length,
      accent: 'slate',
    },
    {
      id: 'done_missing_due_only',
      label: 'Tamamlandı: Sadece Bitiş Boş',
      count: auditStats.doneMissingDueOnly.length,
      accent: 'slate',
    },
    {
      id: 'done_missing_both',
      label: 'Tamamlandı: Her İkisi de Boş',
      count: auditStats.doneMissingBoth.length,
      accent: 'rose',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs font-mono uppercase tracking-widest text-amber-400 font-semibold">
              Özel Denetim & Veri Bütünlüğü Raporu
            </span>
            <span className="px-1.5 py-0.2 bg-amber-950/40 border border-amber-500/30 text-2xs font-mono text-amber-300 rounded">
              TARİH KONTROLÜ
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            Eksik Başlangıç ve Bitiş Tarihi Analizi
          </h1>
          <p className="text-xs font-mono text-slate-400 mt-1">
            (1) Aktif görevlerde Başlangıç Tarihi boş olanlar · (2) Tamamlandı durumunda olup Başlangıç ve/veya Bitiş Tarihi boş olanlar (Alt görevler ve İptal edilenler hariç)
          </p>
        </div>

        <div className="text-2xs font-mono text-slate-400 text-right">
          <div>
            İNCELEME KAPSAMI: <span className="text-white font-bold">{eligibleRows.length.toLocaleString()}</span> kayıt
            {(excludedSubtaskCount > 0 || excludedCancelledCount > 0) && (
              <span className="text-slate-500">
                {' '}({excludedSubtaskCount} alt görev, {excludedCancelledCount} iptal hariç)
              </span>
            )}
          </div>
          <div className="mt-0.5">
            UYGUNSUZLUK: <span className="text-amber-400 font-bold">{auditStats.allAnomalies.length.toLocaleString()}</span> kayıt
          </div>
        </div>
      </div>

      {/* KPI Audit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Anomalies */}
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Toplam Eksik Tarihli
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {auditStats.allAnomalies.length.toLocaleString()}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400">
            Kapsamın %{eligibleRows.length > 0 ? Math.round((auditStats.allAnomalies.length / eligibleRows.length) * 1000) / 10 : 0}'i
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500/40" />
        </div>

        {/* Rule 1 */}
        <div
          onClick={() => setActiveTab('active_missing_start')}
          className="bg-[#0f1219] border border-white/[0.07] hover:border-amber-500/40 rounded-md p-4 relative overflow-hidden cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Aktiflerde Başlangıç Boş
            </span>
            <CalendarOff className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {auditStats.activeMissingStart.length.toLocaleString()}
          </div>
          <div className="mt-1 text-2xs font-mono text-amber-400">
            Tamamlandı & İptal hariç tüm aktifler
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/40" />
        </div>

        {/* Rule 2 */}
        <div
          onClick={() => setActiveTab('done_missing_any')}
          className="bg-[#0f1219] border border-white/[0.07] hover:border-cyan-500/40 rounded-md p-4 relative overflow-hidden cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Tamamlandı: Tarih Eksik
            </span>
            <AlertTriangle className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {auditStats.doneMissingAny.length.toLocaleString()}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 truncate">
            Başlangıç: {auditStats.doneMissingStartOnly.length} · Bitiş: {auditStats.doneMissingDueOnly.length} · İkisi: {auditStats.doneMissingBoth.length}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500/40" />
        </div>

        {/* Compliance Rate */}
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              Tarih Uyumluluk Skoru
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            %{auditStats.complianceRate}
          </div>
          <div className="mt-1 text-2xs font-mono text-emerald-400">
            {auditStats.compliantCount.toLocaleString()} kayıt tam tarihli
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/40" />
        </div>
      </div>

      {/* Audit Segment Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-[#0c0f16] border border-white/[0.06] p-2 rounded-md">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-2xs font-mono border transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                  : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05] hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-2xs font-bold ${
                  isActive
                    ? 'bg-cyan-500/25 text-cyan-200'
                    : 'bg-white/[0.06] text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2 Visual Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {auditCharts.map((cfg) => (
          <div
            key={cfg.id}
            className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-2">
              <span className="text-xs font-mono font-semibold text-slate-200">
                {cfg.title}
              </span>
              <span className="text-2xs font-mono uppercase text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                {displayedRows.length} kayıt
              </span>
            </div>
            <ChartRenderer
              config={cfg}
              rows={displayedRows}
              columnMetaMap={columnMetaMap}
              height={260}
              onElementClick={onChartElementClick}
            />
          </div>
        ))}
      </div>

      {/* Filtered Audit Raw Data Table */}
      <CuratedDataTable
        dataset={dataset}
        filteredRows={displayedRows}
        onSelectRow={onSelectRow}
        title={`Eksik Tarihli Kayıtlar Tablosu (${tabs.find(t => t.id === activeTab)?.label})`}
      />
    </div>
  );
};

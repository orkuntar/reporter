import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ClipboardCheck,
  ArrowRight,
  Pin,
  X
} from 'lucide-react';
import { AppView, ChartConfig, ColumnMeta, Dataset, DataRow } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { CuratedDataTable } from '../common/CuratedDataTable';
import { useLanguage } from '../../i18n/LanguageContext';

interface OverviewViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  pinnedCharts: ChartConfig[];
  onUnpinChart: (id: string) => void;
  onNavigateToView: (view: AppView) => void;
  onSelectRow: (row: DataRow) => void;
  onChartElementClick?: (columnKey: string, value: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  dataset,
  filteredRows,
  columnMetaMap,
  pinnedCharts,
  onUnpinChart,
  onNavigateToView,
  onSelectRow,
  onChartElementClick,
}) => {
  const { t } = useLanguage();
  const isJira = dataset.sourceType === 'jira';
  const total = filteredRows.length;

  // Compute KPI metrics & Monday-style battery segments
  let completedCount = 0;
  let tamamCount = 0;
  let inProgressCount = 0;
  let todoCount = 0;
  let cancelledCount = 0;
  let highPriorityCount = 0;
  let avgLeadTime = 0;
  let leadTimeSum = 0;
  let leadTimeCount = 0;
  const assignees = new Set<string>();
  const statusCol = dataset.jiraFields?.statusCol;
  const hasStatusCol = Boolean(statusCol && columnMetaMap.has(statusCol));
  const hasStatusBucket = columnMetaMap.has('_derived_status_bucket');
  const hasLeadTime = columnMetaMap.has('_derived_lead_time_days');
  const priorityCol = dataset.jiraFields?.priorityCol;
  const hasPriorityCol = Boolean(priorityCol && columnMetaMap.has(priorityCol));
  const assigneeCol = dataset.jiraFields?.assigneeCol;
  const hasAssigneeCol = Boolean(assigneeCol && columnMetaMap.has(assigneeCol));

  filteredRows.forEach(row => {
    if (hasStatusCol && statusCol) {
      const bucket = hasStatusBucket ? row['_derived_status_bucket'] || '' : '';
      const rawStatus = String(row[statusCol] || '').trim().toLowerCase();
      if (rawStatus === 'tamam' || rawStatus === 'tamamlandı' || bucket === 'Tamamlandı') {
        tamamCount++;
      }
      if (bucket === 'Tamamlandı') completedCount++;
      else if (bucket === 'Devam Ediyor') inProgressCount++;
      else if (bucket === 'İptal Edildi') cancelledCount++;
      else todoCount++;
    }

    if (hasPriorityCol && columnMetaMap.has('_derived_priority_score')) {
      const pScore = row['_derived_priority_score'];
      if (pScore >= 4) highPriorityCount++;
    }

    if (hasLeadTime) {
      const lt = row['_derived_lead_time_days'];
      if (typeof lt === 'number' && !isNaN(lt)) {
        leadTimeSum += lt;
        leadTimeCount++;
      }
    }

    if (hasAssigneeCol && assigneeCol) {
      const a = row[assigneeCol];
      if (a && String(a).trim()) assignees.add(String(a).trim());
    }
  });

  if (leadTimeCount > 0) {
    avgLeadTime = Math.round((leadTimeSum / leadTimeCount) * 10) / 10;
  }

  const completionRate = hasStatusCol && total > 0 ? Math.round((completedCount / total) * 1000) / 10 : 0;
  const pctDone = total > 0 ? (completedCount / total) * 100 : 0;
  const pctProg = total > 0 ? (inProgressCount / total) * 100 : 0;
  const pctTodo = total > 0 ? (todoCount / total) * 100 : 0;
  const pctCancel = total > 0 ? (cancelledCount / total) * 100 : 0;

  // Logical Monday-style + Etiket Overview Charts strictly restricted to selected columns
  const candidateJiraCharts: ChartConfig[] = [
    {
      id: 'ov_status',
      title: 'Durum Dağılımı (Status)',
      type: 'donut',
      xAxisCol: hasStatusBucket ? '_derived_status_bucket' : (statusCol || ''),
      aggregation: 'count',
      colorPalette: 'technical',
    },
    {
      id: 'ov_labels',
      title: 'Etiket Dağılımı (Labels)',
      type: 'bar_horizontal',
      xAxisCol: dataset.jiraFields?.labelsCol || '',
      aggregation: 'count',
      colorPalette: 'cyber',
      sortBy: 'value_desc',
      topN: 10,
    },
    {
      id: 'ov_dept_status',
      title: 'Departman x Durum Dağılımı (Board)',
      type: 'bar_stacked',
      xAxisCol: dataset.jiraFields?.departmentCol || '',
      groupByCol: hasStatusBucket ? '_derived_status_bucket' : undefined,
      aggregation: 'count',
      colorPalette: 'technical',
      sortBy: 'value_desc',
      topN: 8,
    },
    {
      id: 'ov_workload',
      title: 'Yazılımcı İş Yükü & Durum Dengesi',
      type: 'bar_horizontal',
      xAxisCol: dataset.jiraFields?.assigneeCol || '',
      groupByCol: hasStatusBucket ? '_derived_status_bucket' : undefined,
      stackedSeries: true,
      aggregation: 'count',
      colorPalette: 'emerald',
      sortBy: 'value_desc',
      topN: 10,
    },
    {
      id: 'ov_weekly_velocity',
      title: 'Haftalık İş Akışı Trendi (Velocity)',
      type: 'area',
      xAxisCol: dataset.jiraFields?.startDateCol || dataset.jiraFields?.createdCol || '',
      groupByCol: hasStatusBucket ? '_derived_status_bucket' : undefined,
      dateGranularity: 'week',
      stackedSeries: true,
      aggregation: 'count',
      colorPalette: 'technical',
      sortBy: 'date_asc',
    },
    {
      id: 'ov_priority',
      title: 'Öncelik Seviyeleri (Priority)',
      type: 'bar_vertical',
      xAxisCol: dataset.jiraFields?.priorityCol || '',
      aggregation: 'count',
      colorPalette: 'warm',
      sortBy: 'value_desc',
      topN: 8,
    },
    {
      id: 'ov_type',
      title: 'Konu Türü (Issue Type)',
      type: 'bar_horizontal',
      xAxisCol: dataset.jiraFields?.typeCol || '',
      aggregation: 'count',
      colorPalette: 'cyber',
      sortBy: 'value_desc',
      topN: 8,
    },
    {
      id: 'ov_department',
      title: 'Talep Eden Departmanlar',
      type: 'bar_vertical',
      xAxisCol: dataset.jiraFields?.departmentCol || '',
      aggregation: 'count',
      colorPalette: 'emerald',
      sortBy: 'value_desc',
      topN: 8,
    },
  ];

  const validJiraCharts = candidateJiraCharts.filter(
    cfg => cfg.xAxisCol && columnMetaMap.has(cfg.xAxisCol) && (!cfg.groupByCol || columnMetaMap.has(cfg.groupByCol))
  );

  // If user selected custom/non-Jira columns, dynamically generate overview charts from checked columns
  const selectableActiveCols = dataset.columns.filter(c => !c.key.startsWith('_derived_'));
  const overviewCharts: ChartConfig[] =
    validJiraCharts.length > 0
      ? validJiraCharts
      : selectableActiveCols.slice(0, 6).map((col, idx) => ({
          id: `ov_dynamic_${idx}`,
          title: `${col.label} Dağılımı`,
          type: col.type === 'date' || col.isDateColumn ? 'area' : idx % 3 === 0 ? 'donut' : idx % 2 === 0 ? 'bar_vertical' : 'bar_horizontal',
          xAxisCol: col.key,
          dateGranularity: col.type === 'date' || col.isDateColumn ? 'week' : undefined,
          aggregation: 'count',
          colorPalette: (['technical', 'cyber', 'emerald', 'warm'] as const)[idx % 4],
          sortBy: col.type === 'date' || col.isDateColumn ? 'date_asc' : 'value_desc',
          topN: 10,
        }));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Top Banner & Telemetry Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              {t.executiveSummary}
            </span>
            <span className="px-1.5 py-0.2 bg-white/[0.05] border border-white/[0.1] text-2xs font-mono text-slate-300 rounded">
              {dataset.sourceType.toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            {dataset.name}
          </h1>
        </div>

        <div className="flex items-center space-x-3 text-2xs font-mono text-slate-400">
          {isJira && hasStatusCol && (
            <button
              onClick={() => onNavigateToView('audit_report')}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/35 text-amber-300 rounded transition-colors"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Tarih Eksiklik Raporu</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              {t.activeScope}
            </span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
            {total.toLocaleString()}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 flex items-center justify-between">
            <span>{t.totalRecords}</span>
            <span className="text-cyan-400 font-semibold">{dataset.rows.length.toLocaleString()} toplam</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500/30" />
        </div>

        {/* Completion Rate */}
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              {t.completionRate}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
            {hasStatusCol ? `%${completionRate}` : '—'}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 flex items-center justify-between">
            <span>{hasStatusCol ? `${completedCount} ${t.completed}` : 'Durum kolonu pasif'}</span>
            <span className="text-emerald-400">{hasStatusCol ? `${inProgressCount} ${t.inProgress}` : ''}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500/30" />
        </div>

        {/* Lead / Cycle Time */}
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              {t.meanResolutionCycle}
            </span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {avgLeadTime > 0 ? `${avgLeadTime} gün` : 'N/A'}
            </span>
            {hasStatusCol && (
              <span className="text-xs font-mono text-emerald-400 font-semibold">
                ({tamamCount.toLocaleString()} Tamam)
              </span>
            )}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 flex items-center justify-between">
            <span>{t.cycleDuration}</span>
            <span className="text-indigo-400">{leadTimeCount} {t.measuredIssues}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500/30" />
        </div>

        {/* Critical Attention / Assignees */}
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 relative overflow-hidden group hover:border-white/[0.15] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase tracking-wider text-slate-400">
              {t.highSeverityFocus}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white tracking-tight">
            {hasPriorityCol ? highPriorityCount : '—'}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400 flex items-center justify-between">
            <span>{hasPriorityCol ? 'Highest & High' : 'Öncelik kolonu pasif'}</span>
            <span className="text-amber-400">{hasAssigneeCol ? `${assignees.size} ${t.activeAssignees}` : ''}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/30" />
        </div>
      </div>

      {/* Monday-Style Status Battery Progress Strip */}
      {isJira && hasStatusCol && total > 0 && (
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 space-y-2.5">
          <div className="flex items-center justify-between text-2xs font-mono">
            <span className="uppercase tracking-wider text-slate-400 font-semibold">
              İş Akışı Sağlık Çubuğu (Status Battery)
            </span>
            <div className="flex flex-wrap items-center gap-4 text-slate-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-xs bg-emerald-500" />
                <span>Tamamlandı: <strong>{completedCount}</strong> (%{pctDone.toFixed(1)})</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-xs bg-cyan-500" />
                <span>Devam Ediyor: <strong>{inProgressCount}</strong> (%{pctProg.toFixed(1)})</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-xs bg-slate-500" />
                <span>Yapılacak: <strong>{todoCount}</strong> (%{pctTodo.toFixed(1)})</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-xs bg-rose-500" />
                <span>İptal Edildi: <strong>{cancelledCount}</strong> (%{pctCancel.toFixed(1)})</span>
              </span>
            </div>
          </div>

          <div className="h-3 w-full rounded-sm overflow-hidden flex bg-white/[0.04]">
            {pctDone > 0 && (
              <div
                style={{ width: `${pctDone}%` }}
                className="bg-emerald-500 h-full transition-all duration-300"
                title={`Tamamlandı: ${completedCount}`}
              />
            )}
            {pctProg > 0 && (
              <div
                style={{ width: `${pctProg}%` }}
                className="bg-cyan-500 h-full transition-all duration-300"
                title={`Devam Ediyor: ${inProgressCount}`}
              />
            )}
            {pctTodo > 0 && (
              <div
                style={{ width: `${pctTodo}%` }}
                className="bg-slate-500 h-full transition-all duration-300"
                title={`Yapılacak: ${todoCount}`}
              />
            )}
            {pctCancel > 0 && (
              <div
                style={{ width: `${pctCancel}%` }}
                className="bg-rose-500 h-full transition-all duration-300"
                title={`İptal Edildi: ${cancelledCount}`}
              />
            )}
          </div>
        </div>
      )}

      {/* 8-Chart Analytical Grid (Monday-Style & Etiket Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {overviewCharts.map((cfg) => (
          <div
            key={cfg.id}
            className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-2">
              <span className="text-xs font-mono font-semibold text-slate-200">
                {cfg.title}
              </span>
              <span className="text-2xs font-mono uppercase text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded">
                {cfg.type.replace('_', ' ')}
              </span>
            </div>
            <ChartRenderer
              config={cfg}
              rows={filteredRows}
              columnMetaMap={columnMetaMap}
              height={280}
              onElementClick={onChartElementClick}
            />
          </div>
        ))}
      </div>

      {/* Pinned Custom Charts Section */}
      {pinnedCharts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-2xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
            <Pin className="w-3.5 h-3.5" />
            <span>Sabitlenen Özel Grafikler ({pinnedCharts.length})</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {pinnedCharts.map((cfg) => (
              <div
                key={cfg.id}
                className="bg-[#0f1219] border border-emerald-500/25 rounded-md p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-2">
                  <span className="text-xs font-mono font-semibold text-slate-200">
                    {cfg.title}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xs font-mono uppercase text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30">
                      {cfg.type.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => onUnpinChart(cfg.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded transition-colors no-print"
                      title="Genel Bakıştan Kaldır"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <ChartRenderer
                  config={cfg}
                  rows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  height={280}
                  onElementClick={onChartElementClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dedicated Filtered Raw Data Table */}
      <div className="pt-2">
        <CuratedDataTable
          dataset={dataset}
          filteredRows={filteredRows}
          onSelectRow={onSelectRow}
          title={t.curatedTableTitle}
        />
      </div>
    </div>
  );
};

import React from 'react';
import {
  GitPullRequest,
  Bug,
  Activity
} from 'lucide-react';
import { ChartConfig, ColumnMeta, Dataset, DataRow } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { CuratedDataTable } from '../common/CuratedDataTable';
import { useLanguage } from '../../i18n/LanguageContext';

interface JiraAnalyticsViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  onSelectRow: (row: DataRow) => void;
}

export const JiraAnalyticsView: React.FC<JiraAnalyticsViewProps> = ({
  dataset,
  filteredRows,
  columnMetaMap,
  onSelectRow,
}) => {
  const { t } = useLanguage();

  // Compute Jira-specific deep stats
  let bugCount = 0;
  let featureCount = 0;
  let revisionCount = 0;

  filteredRows.forEach(row => {
    const labels = row['_merged_Etiketler'] || [];
    if (Array.isArray(labels)) {
      if (labels.includes('BUG')) bugCount++;
      if (labels.includes('FEATURE')) featureCount++;
      if (labels.includes('REVISION')) revisionCount++;
    }
  });

  const jiraCharts: ChartConfig[] = [
    {
      id: 'jira_status_funnel',
      title: 'İş Akış Durum Pipeline Dağılımı',
      type: 'bar_horizontal',
      xAxisCol: dataset.jiraFields?.statusCol || 'Durum',
      aggregation: 'count',
      colorPalette: 'technical',
      sortBy: 'value_desc',
      topN: 10,
    },
    {
      id: 'jira_lead_time',
      title: 'Çözüm Süresi Dağılımı (Lead Time - Gün)',
      type: 'bar_vertical',
      xAxisCol: '_derived_lead_time_days',
      aggregation: 'count',
      colorPalette: 'emerald',
      sortBy: 'value_desc',
      topN: 12,
    },
    {
      id: 'jira_assignee_workload',
      title: 'Yazılımcı / Atanan Kişi İş Dağılımı',
      type: 'bar_horizontal',
      xAxisCol: dataset.jiraFields?.assigneeCol || 'Atanan Kişi',
      aggregation: 'count',
      colorPalette: 'cyber',
      sortBy: 'value_desc',
      topN: 10,
    },
    {
      id: 'jira_dept_demand',
      title: 'Talep Eden Departman Dağılımı',
      type: 'donut',
      xAxisCol: dataset.jiraFields?.departmentCol || 'Özel alan (Talep Eden Departman)',
      aggregation: 'count',
      colorPalette: 'warm',
      topN: 8,
    },
    {
      id: 'jira_priority_radar',
      title: 'Öncelik Seviyesi Radarı',
      type: 'radar',
      xAxisCol: dataset.jiraFields?.priorityCol || 'Öncelik',
      aggregation: 'count',
      colorPalette: 'technical',
    },
    {
      id: 'jira_type_comp',
      title: 'Konu Türü Sınıflandırması',
      type: 'donut',
      xAxisCol: dataset.jiraFields?.typeCol || 'Konu Türü',
      aggregation: 'count',
      colorPalette: 'emerald',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              {t.specializedJiraModule}
            </span>
            <span className="px-1.5 py-0.2 bg-cyan-950/40 border border-cyan-500/30 text-2xs font-mono text-cyan-300 rounded">
              İŞ AKIŞI & SLA
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            {t.jiraWorkflowAnalytics}
          </h1>
        </div>

        <div className="text-2xs font-mono text-slate-400">
          <span>KAPSAM: </span>
          <span className="text-cyan-400 font-bold">{filteredRows.length} aktif kayıt</span>
        </div>
      </div>

      {/* Jira Tag Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase text-slate-400">{t.defectDensity}</span>
            <Bug className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {bugCount}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400">
            %{filteredRows.length > 0 ? Math.round((bugCount / filteredRows.length) * 100) : 0} aktif kapsam oranı
          </div>
        </div>

        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase text-slate-400">{t.featureDeliveries}</span>
            <GitPullRequest className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {featureCount}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400">
            %{filteredRows.length > 0 ? Math.round((featureCount / filteredRows.length) * 100) : 0} aktif kapsam oranı
          </div>
        </div>

        <div className="bg-[#0f1219] border border-white/[0.07] rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-mono uppercase text-slate-400">{t.revisionsIterations}</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {revisionCount}
          </div>
          <div className="mt-1 text-2xs font-mono text-slate-400">
            %{filteredRows.length > 0 ? Math.round((revisionCount / filteredRows.length) * 100) : 0} aktif kapsam oranı
          </div>
        </div>
      </div>

      {/* Grid of 6 Specialized Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {jiraCharts.map((cfg) => (
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
              height={270}
            />
          </div>
        ))}
      </div>

      {/* Curated Raw Data Table in Jira Analytics */}
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

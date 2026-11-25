import React from 'react';
import { Calendar, X, SlidersHorizontal } from 'lucide-react';
import { Dataset, DateFilterState } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { SearchableSelect } from '../common/SearchableSelect';

interface DateFilterBarProps {
  dataset: Dataset;
  dateFilter: DateFilterState;
  onChangeDateFilter: (next: DateFilterState) => void;
  onClearDateFilter: () => void;
  onOpenFieldMapping?: () => void;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  dataset,
  dateFilter,
  onChangeDateFilter,
  onClearDateFilter,
  onOpenFieldMapping,
}) => {
  const { t } = useLanguage();

  // Include inferred date columns PLUS any user-assigned main date filter fields
  const mappedDateKeys = new Set(
    [
      dataset.jiraFields?.startDateCol,
      dataset.jiraFields?.workStartDateCol,
      dataset.jiraFields?.dueCol,
      dataset.jiraFields?.createdCol,
      dataset.jiraFields?.resolvedCol,
    ].filter(Boolean) as string[]
  );
  const dateCols = dataset.columns.filter(
    c =>
      mappedDateKeys.has(c.key) ||
      c.type === 'date' ||
      c.isDateColumn ||
      c.key.toLowerCase().includes('tarih')
  );

  const isFilterActive = Boolean(
    dateFilter.startDate ||
    dateFilter.endDate ||
    dateFilter.workStartedFilter !== 'all' ||
    dateFilter.dueFilter !== 'all'
  );

  const applyPreset = (days: number | 'year' | 'all') => {
    if (days === 'all') {
      onChangeDateFilter({
        ...dateFilter,
        startDate: '',
        endDate: '',
      });
      return;
    }

    const today = new Date();
    const endStr = today.toISOString().split('T')[0];

    if (days === 'year') {
      const startStr = `${today.getFullYear()}-01-01`;
      onChangeDateFilter({
        ...dateFilter,
        startDate: startStr,
        endDate: endStr,
      });
      return;
    }

    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const startStr = start.toISOString().split('T')[0];

    onChangeDateFilter({
      ...dateFilter,
      startDate: startStr,
      endDate: endStr,
    });
  };

  return (
    <div className="bg-[#090c12] border-b border-white/[0.06] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none no-print">
      {/* Left side: Baseline selector and date range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold tracking-wider uppercase text-2xs">
          <Calendar className="w-3.5 h-3.5" />
          <span>{t.dateFiltersTitle}</span>
        </div>

        {/* Baseline Date Selector (Searchable) */}
        <div className="flex items-center space-x-1.5 bg-[#121620] border border-white/[0.08] px-2 py-1 rounded">
          <span className="text-2xs text-slate-400">{t.baselineDateLabel}</span>
          <SearchableSelect
            value={dateFilter.baselineCol}
            onChange={(val) => onChangeDateFilter({ ...dateFilter, baselineCol: val })}
            options={dateCols.map(c => ({ value: c.key, label: c.label }))}
            searchPlaceholder="Tarih kolonu ara..."
            className="w-48"
            dropdownWidthClass="min-w-[260px]"
            triggerClassName="w-full bg-[#181d2a] border border-white/[0.1] hover:border-white/20 text-2xs text-cyan-300 rounded px-1.5 py-0.5 font-mono"
            title={t.baselineDateHelp}
          />
        </div>

        {/* Date Inputs (Start & End) */}
        <div className="flex items-center space-x-1.5 bg-[#121620] border border-white/[0.08] px-2 py-1 rounded">
          <span className="text-2xs text-slate-400">{t.dateRangeFrom}:</span>
          <input
            type="date"
            value={dateFilter.startDate}
            onChange={(e) => onChangeDateFilter({ ...dateFilter, startDate: e.target.value })}
            className="bg-[#181d2a] border border-white/[0.1] text-2xs text-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500"
          />
          <span className="text-2xs text-slate-500">-</span>
          <span className="text-2xs text-slate-400">{t.dateRangeTo}:</span>
          <input
            type="date"
            value={dateFilter.endDate}
            onChange={(e) => onChangeDateFilter({ ...dateFilter, endDate: e.target.value })}
            className="bg-[#181d2a] border border-white/[0.1] text-2xs text-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Presets */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => applyPreset('all')}
            className="px-2 py-0.5 text-2xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-colors"
          >
            {t.allDates}
          </button>
          <button
            onClick={() => applyPreset(7)}
            className="px-2 py-0.5 text-2xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-colors"
          >
            {t.last7Days}
          </button>
          <button
            onClick={() => applyPreset(30)}
            className="px-2 py-0.5 text-2xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-colors"
          >
            {t.last30Days}
          </button>
          <button
            onClick={() => applyPreset(90)}
            className="px-2 py-0.5 text-2xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-colors"
          >
            {t.last90Days}
          </button>
          <button
            onClick={() => applyPreset('year')}
            className="px-2 py-0.5 text-2xs text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded transition-colors"
          >
            {t.thisYear}
          </button>
        </div>
      </div>

      {/* Right side: Yapıma Başlandı & Bitiş Tarihi quick filters & Clear */}
      <div className="flex items-center space-x-2">
        {/* Yapıma Başlandı Filter (only if column is selected) */}
        {dataset.jiraFields?.workStartDateCol && (
          <div className="flex items-center space-x-1 text-2xs">
            <span className="text-slate-400">Yapıma Başlandı:</span>
            <SearchableSelect
              value={dateFilter.workStartedFilter}
              onChange={(val) => onChangeDateFilter({ ...dateFilter, workStartedFilter: val as any })}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'filled', label: 'Başlanmış' },
                { value: 'empty', label: 'Başlanmamış' },
              ]}
              searchPlaceholder="Ara..."
              className="w-28"
              dropdownWidthClass="min-w-[150px]"
              triggerClassName={`w-full border rounded px-1.5 py-0.5 text-2xs font-mono ${
                dateFilter.workStartedFilter !== 'all'
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-[#181d2a] border-white/[0.1] text-slate-300'
              }`}
            />
          </div>
        )}

        {/* Bitiş Tarihi Filter (only if column is selected) */}
        {dataset.jiraFields?.dueCol && (
          <div className="flex items-center space-x-1 text-2xs">
            <span className="text-slate-400">Bitiş Tarihi:</span>
            <SearchableSelect
              value={dateFilter.dueFilter}
              onChange={(val) => onChangeDateFilter({ ...dateFilter, dueFilter: val as any })}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'filled', label: 'Tarih Girilmiş' },
                { value: 'empty', label: 'Tarih Boş' },
              ]}
              searchPlaceholder="Ara..."
              className="w-32"
              dropdownWidthClass="min-w-[160px]"
              triggerClassName={`w-full border rounded px-1.5 py-0.5 text-2xs font-mono ${
                dateFilter.dueFilter !== 'all'
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 font-semibold'
                  : 'bg-[#181d2a] border-white/[0.1] text-slate-300'
              }`}
            />
          </div>
        )}

        {onOpenFieldMapping && (
          <button
            type="button"
            onClick={onOpenFieldMapping}
            className="flex items-center space-x-1 px-2 py-0.5 text-2xs text-cyan-300 hover:text-white bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 rounded transition-colors"
            title="Başlangıç, Bitiş, Yapıma Başlama ve Durum gibi ana filtre alanlarını eşleştirin veya boş bırakın"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Ana Alanlar</span>
          </button>
        )}

        {/* Reset button */}
        {isFilterActive && (
          <button
            onClick={onClearDateFilter}
            className="flex items-center space-x-1 px-2 py-0.5 text-2xs text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded transition-colors"
            title={t.clearDates}
          >
            <X className="w-3 h-3" />
            <span>{t.reset}</span>
          </button>
        )}
      </div>
    </div>
  );
};

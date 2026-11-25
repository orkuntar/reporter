import React from 'react';
import { X, Filter, RotateCcw } from 'lucide-react';
import { ColumnMeta, DateFilterState, FilterGroup } from '../../types';

interface ActiveFilterBarProps {
  dateFilter: DateFilterState;
  quickFacets: Record<string, string[]>;
  filterGroup: FilterGroup;
  columnMetaMap: Map<string, ColumnMeta>;
  onClearDateRange: () => void;
  onClearWorkStarted: () => void;
  onClearDueFilter: () => void;
  onRemoveFacetValue: (colKey: string, val: string) => void;
  onRemoveRule: (ruleId: string) => void;
  onClearAll: () => void;
}

export const ActiveFilterBar: React.FC<ActiveFilterBarProps> = ({
  dateFilter,
  quickFacets,
  filterGroup,
  columnMetaMap,
  onClearDateRange,
  onClearWorkStarted,
  onClearDueFilter,
  onRemoveFacetValue,
  onRemoveRule,
  onClearAll,
}) => {
  const hasDateRange = Boolean(dateFilter.startDate || dateFilter.endDate);
  const hasWorkStarted = dateFilter.workStartedFilter !== 'all';
  const hasDue = dateFilter.dueFilter !== 'all';

  const facetChips: { colKey: string; colLabel: string; value: string }[] = [];
  Object.entries(quickFacets).forEach(([colKey, vals]) => {
    if (!vals || vals.length === 0) return;
    const meta = columnMetaMap.get(colKey);
    const label = meta?.label || colKey;
    vals.forEach(v => {
      facetChips.push({ colKey, colLabel: label, value: v });
    });
  });

  const activeRules = filterGroup.rules.filter(r => r.column);

  if (!hasDateRange && !hasWorkStarted && !hasDue && facetChips.length === 0 && activeRules.length === 0) {
    return null;
  }

  const baseColLabel = columnMetaMap.get(dateFilter.baselineCol)?.label || dateFilter.baselineCol;

  return (
    <div className="bg-[#0b0e14] border-b border-white/[0.06] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-2xs font-mono select-none no-print">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center space-x-1 text-slate-400 uppercase tracking-wider mr-1">
          <Filter className="w-3 h-3 text-cyan-400" />
          <span>Aktif Filtreler:</span>
        </span>

        {hasDateRange && (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-cyan-950/35 border border-cyan-500/35 text-cyan-300 rounded">
            <span>
              {baseColLabel}: {dateFilter.startDate || '...'} → {dateFilter.endDate || '...'}
            </span>
            <button onClick={onClearDateRange} className="hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {hasWorkStarted && (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-cyan-950/35 border border-cyan-500/35 text-cyan-300 rounded">
            <span>
              Yapıma Başlandı: {dateFilter.workStartedFilter === 'filled' ? 'Başlanmış' : 'Başlanmamış'}
            </span>
            <button onClick={onClearWorkStarted} className="hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {hasDue && (
          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-cyan-950/35 border border-cyan-500/35 text-cyan-300 rounded">
            <span>
              Bitiş Tarihi: {dateFilter.dueFilter === 'filled' ? 'Tarih Girilmiş' : 'Tarih Boş'}
            </span>
            <button onClick={onClearDueFilter} className="hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {facetChips.map(chip => (
          <span
            key={`${chip.colKey}_${chip.value || '__empty__'}`}
            className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-indigo-950/35 border border-indigo-500/35 text-indigo-300 rounded"
          >
            <span>
              {chip.colLabel}: <strong>{chip.value === '' ? '(Boş)' : chip.value}</strong>
            </span>
            <button onClick={() => onRemoveFacetValue(chip.colKey, chip.value)} className="hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {activeRules.map(rule => {
          const colLabel = columnMetaMap.get(rule.column)?.label || rule.column;
          return (
            <span
              key={rule.id}
              className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-amber-950/35 border border-amber-500/35 text-amber-300 rounded"
            >
              <span>
                {colLabel} ({rule.operator}) {rule.value !== undefined && rule.value !== '' ? `"${rule.value}"` : ''}
              </span>
              <button onClick={() => onRemoveRule(rule.id)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      <button
        onClick={onClearAll}
        className="flex items-center space-x-1 px-2 py-0.5 text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded transition-colors flex-shrink-0"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Tümünü Temizle</span>
      </button>
    </div>
  );
};

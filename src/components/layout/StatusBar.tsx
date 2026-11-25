import React from 'react';
import { Filter } from 'lucide-react';
import { Dataset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface StatusBarProps {
  dataset: Dataset | null;
  filteredCount: number;
  totalCount: number;
  activeFilterCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  dataset,
  filteredCount,
  totalCount,
  activeFilterCount,
}) => {
  const { t } = useLanguage();
  const percentage = totalCount > 0 ? Math.round((filteredCount / totalCount) * 1000) / 10 : 0;

  return (
    <footer className="h-7 w-full bg-[#07080b] border-t border-white/[0.06] flex items-center justify-between px-3 text-2xs font-mono text-slate-400 select-none">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300">{t.systemReady}</span>
        </div>

        {dataset && (
          <div className="flex items-center space-x-1 text-slate-400 border-l border-white/10 pl-4">
            <span>{t.columns}:</span>
            <span className="text-slate-200">{dataset.columns.length}</span>
          </div>
        )}

        {dataset && (
          <div className="flex items-center space-x-1 text-slate-400 border-l border-white/10 pl-4">
            <span>{t.records}:</span>
            <span className="text-slate-200">{filteredCount.toLocaleString()}</span>
            <span>/</span>
            <span>{totalCount.toLocaleString()}</span>
            <span className="text-cyan-400">({percentage}%)</span>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {activeFilterCount > 0 ? (
          <div className="flex items-center space-x-1 text-amber-400">
            <Filter className="w-3 h-3" />
            <span>{activeFilterCount} {t.activeFiltersCount}</span>
          </div>
        ) : (
          <span className="text-slate-500">{t.noActiveFilters}</span>
        )}

        <div className="border-l border-white/10 pl-4 text-slate-500">
          <span>{t.source}: {dataset ? dataset.sourceType.toUpperCase() : 'NONE'}</span>
        </div>
      </div>
    </footer>
  );
};

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Check, X, Search, ChevronsLeft, ChevronsRight, Filter } from 'lucide-react';
import { ColumnMeta, Dataset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface QuickFacetsProps {
  columns: ColumnMeta[];
  jiraFields?: Dataset['jiraFields'];
  selectedFacets: Record<string, string[]>;
  onToggleFacetValue: (columnKey: string, value: string) => void;
  onClearFacetColumn: (columnKey: string) => void;
  onClearAllFacets: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const EXCLUDED_PATTERNS = [
  'proje anahtarı',
  'proje adı',
  'proje lideri',
  'proje türü',
  'proje açıklaması',
  'project key',
  'project name',
  'project lead',
  'project type',
  'kimliği',
  'onaylar',
  'development',
  'oylar',
  'rank',
  'çözüm',
];

const PRIORITY_FACET_KEYS = [
  'durum',
  'öncelik',
  'konu türü',
  'talep eden departman',
  'atanan kişi',
  'ortam',
  'etiketler',
];

function getFriendlyFacetLabel(col: ColumnMeta, jiraFields?: Dataset['jiraFields']): string {
  if (jiraFields?.statusCol === col.key) return `Durum (${col.label})`;
  if (jiraFields?.priorityCol === col.key) return `Öncelik (${col.label})`;
  if (jiraFields?.typeCol === col.key) return `Konu Türü (${col.label})`;
  if (jiraFields?.departmentCol === col.key) return 'Departman';
  if (jiraFields?.assigneeCol === col.key) return 'Yazılımcı (Atanan)';
  if (jiraFields?.environmentCol === col.key) return 'Ortam';
  if (jiraFields?.labelsCol === col.key) return 'Etiketler';
  const lk = col.key.toLowerCase();
  if (lk.includes('talep eden departman') || lk === 'department') return 'Departman';
  if (lk === 'atanan kişi' || lk === 'assignee') return 'Yazılımcı (Atanan)';
  if (lk.includes('ortam')) return 'Ortam';
  if (lk.startsWith('_merged_etiketler') || lk === 'etiketler') return 'Etiketler';
  if (lk.includes('ilgili modül')) return 'İlgili Modül';
  return col.label;
}

export const QuickFacets: React.FC<QuickFacetsProps> = ({
  columns,
  jiraFields,
  selectedFacets,
  onToggleFacetValue,
  onClearFacetColumn,
  onClearAllFacets,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [facetSearches, setFacetSearches] = useState<Record<string, string>>({});

  const facetColumns = useMemo(() => {
    const mappedPriorityKeys = [
      jiraFields?.statusCol,
      jiraFields?.priorityCol,
      jiraFields?.typeCol,
      jiraFields?.departmentCol,
      jiraFields?.assigneeCol,
      jiraFields?.environmentCol,
      jiraFields?.labelsCol,
    ].filter(Boolean) as string[];
    const mappedSet = new Set(mappedPriorityKeys);

    const candidates = columns.filter(c => {
      if (c.key.startsWith('_derived_')) return false;
      const lk = c.key.toLowerCase();
      const lLabel = c.label.toLowerCase();

      if (mappedSet.has(c.key)) {
        return c.topValues.length > 0 || c.missingCount > 0;
      }

      // Explicitly exclude project metadata & IDs
      if (EXCLUDED_PATTERNS.some(pat => lk.includes(pat) || lLabel.includes(pat))) {
        return false;
      }

      // Skip raw duplicate sub-columns if a _merged_ version exists
      if (c.key.includes('__')) return false;
      if (!c.key.startsWith('_merged_') && columns.some(other => other.key === `_merged_${c.key}`)) {
        return false;
      }

      const isDeptOrDev =
        lk.includes('talep eden departman') ||
        lk === 'atanan kişi' ||
        lk === 'assignee' ||
        lk === 'department';

      if (isDeptOrDev && (c.topValues.length > 0 || c.missingCount > 0)) {
        return true;
      }

      // Otherwise include categories/arrays with meaningful variance (>= 2 unique values)
      return (
        (c.type === 'category' || c.type === 'array' || (c.uniqueCount >= 2 && c.uniqueCount <= 40)) &&
        c.topValues.length >= 2
      );
    });

    // Sort so user-assigned main filter groups & priority facets appear first
    candidates.sort((a, b) => {
      const mA = mappedPriorityKeys.indexOf(a.key);
      const mB = mappedPriorityKeys.indexOf(b.key);
      if (mA !== -1 || mB !== -1) {
        return (mA === -1 ? 999 : mA) - (mB === -1 ? 999 : mB);
      }
      const aIdx = PRIORITY_FACET_KEYS.findIndex(pk => a.key.toLowerCase().includes(pk));
      const bIdx = PRIORITY_FACET_KEYS.findIndex(pk => b.key.toLowerCase().includes(pk));
      const aRank = aIdx === -1 ? 999 : aIdx;
      const bRank = bIdx === -1 ? 999 : bIdx;
      return aRank - bRank;
    });

    return candidates.slice(0, 8);
  }, [columns, jiraFields]);

  const toggleCollapse = (key: string) => {
    setCollapsedCols(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = Object.values(selectedFacets).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);
  const hasAnySelected = activeCount > 0;

  if (facetColumns.length === 0) return null;

  if (isCollapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        title="Hızlı Filtreleri Aç"
        className="w-10 bg-[#0a0d12] border-r border-white/[0.06] flex flex-col items-center py-3 cursor-pointer hover:bg-white/[0.02] transition-all duration-200 select-none flex-shrink-0 group no-print"
      >
        <button
          type="button"
          className="p-1 text-slate-400 group-hover:text-cyan-400 rounded transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>

        {activeCount > 0 && (
          <span className="mt-2 px-1.5 py-0.5 text-[9px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full font-bold">
            {activeCount}
          </span>
        )}

        <div className="mt-6 flex-1 flex items-start justify-center">
          <span
            className="text-2xs font-mono uppercase tracking-widest text-slate-400 group-hover:text-slate-200 whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {t.quickFacets}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-[#0a0d12] border-r border-white/[0.06] flex flex-col h-full select-none transition-all duration-200 flex-shrink-0 no-print">
      <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
        <div className="text-2xs font-mono uppercase tracking-widest text-slate-400 font-semibold truncate">
          {t.quickFacets}
        </div>
        <div className="flex items-center space-x-1.5">
          {hasAnySelected && (
            <button
              onClick={onClearAllFacets}
              className="text-2xs font-mono text-rose-400 hover:text-rose-300 flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>{t.reset}</span>
            </button>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.05] rounded transition-colors"
            title="Hızlı Filtreleri Daralt"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
        {facetColumns.map(col => {
          const isCollapsed = collapsedCols[col.key];
          const selected = selectedFacets[col.key] || [];
          const searchQuery = (facetSearches[col.key] || '').toLocaleLowerCase('tr-TR');
          const friendlyLabel = getFriendlyFacetLabel(col, jiraFields);

          // Combine topValues with "(Boş)" if column has missing values and is Departman / Yazılımcı
          const allOptions = [...col.topValues];
          const lk = col.key.toLowerCase();
          if (
            col.missingCount > 0 &&
            (jiraFields?.departmentCol === col.key ||
              jiraFields?.assigneeCol === col.key ||
              lk.includes('talep eden departman') ||
              lk === 'atanan kişi' ||
              lk === 'assignee')
          ) {
            allOptions.push({ value: '', count: col.missingCount });
          }

          const filteredValues = allOptions.filter(tv => {
            const label = tv.value === '' ? '(Boş / Atanmamış)' : tv.value;
            return label.toLocaleLowerCase('tr-TR').includes(searchQuery);
          });

          return (
            <div key={col.key} className="p-2.5">
              <div
                onClick={() => toggleCollapse(col.key)}
                className="flex items-center justify-between cursor-pointer group py-1"
              >
                <div className="flex items-center space-x-1.5 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300 flex-shrink-0" />
                  )}
                  <span className="text-xs font-mono font-medium text-slate-300 group-hover:text-white truncate">
                    {friendlyLabel}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {selected.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-2xs font-mono rounded">
                      {selected.length}
                    </span>
                  )}
                  {selected.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearFacetColumn(col.key);
                      }}
                      className="p-0.5 text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="mt-2 space-y-1">
                  {allOptions.length > 2 && (
                    <div className="relative mb-1.5">
                      <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="Ara..."
                        value={facetSearches[col.key] || ''}
                        onChange={(e) =>
                          setFacetSearches(prev => ({ ...prev, [col.key]: e.target.value }))
                        }
                        className="w-full bg-[#121620] border border-white/[0.06] rounded text-2xs text-slate-300 pl-6 pr-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
                    {filteredValues.map(tv => {
                      const isChecked = selected.includes(tv.value);
                      const displayLabel = tv.value === '' ? '(Boş / Atanmamış)' : tv.value;

                      return (
                        <div
                          key={tv.value || '__empty__'}
                          onClick={() => onToggleFacetValue(col.key, tv.value)}
                          className={`flex items-center justify-between px-2 py-1 rounded text-2xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate pr-2">
                            <div
                              className={`w-3 h-3 rounded-2xs border flex items-center justify-center flex-shrink-0 ${
                                isChecked
                                  ? 'bg-cyan-500 border-cyan-400 text-black'
                                  : 'border-white/20 bg-transparent'
                              }`}
                            >
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className={`truncate ${tv.value === '' ? 'italic text-slate-500' : ''}`}>
                              {displayLabel}
                            </span>
                          </div>
                          <span className="text-2xs font-mono text-slate-400 flex-shrink-0">
                            {tv.count}
                          </span>
                        </div>
                      );
                    })}

                    {filteredValues.length === 0 && (
                      <div className="text-2xs font-mono text-slate-500 py-2 text-center">
                        Eşleşme yok
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

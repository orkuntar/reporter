import React, { useState } from 'react';
import { Search, Columns } from 'lucide-react';
import { Dataset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSelectableColumns } from '../../core/parser';

interface SchemaViewProps {
  dataset: Dataset;
  onOpenColumnSelection?: () => void;
}

export const SchemaView: React.FC<SchemaViewProps> = ({ dataset, onOpenColumnSelection }) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const totalSelectableCount = getSelectableColumns(dataset).length;
  const activeSelectedCount = dataset.selectedColumnKeys?.length ?? dataset.columns.filter(c => !c.key.startsWith('_derived_')).length;

  const filteredColumns = dataset.columns.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.key.toLowerCase().includes(search.toLowerCase()) ||
    c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#090b10] select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-2xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
              {t.schemaTitle}
            </span>
            <span className="px-1.5 py-0.2 bg-white/[0.05] border border-white/[0.1] text-2xs font-mono text-slate-300 rounded">
              {activeSelectedCount} / {totalSelectableCount} {t.columns.toLowerCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            {t.schemaTypes}
          </h1>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenColumnSelection && (
            <button
              onClick={onOpenColumnSelection}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-cyan-950/35 hover:bg-cyan-900/45 border border-cyan-500/40 text-xs font-mono text-cyan-300 transition-colors"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Kullanılacak Kolonları Seç</span>
            </button>
          )}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={t.searchColumns}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#141822] border border-white/[0.08] rounded text-xs text-slate-200 pl-8 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Schema Table */}
      <div className="bg-[#0f1219] border border-white/[0.08] rounded-md overflow-hidden">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead className="bg-[#0c0f16] border-b border-white/[0.08]">
            <tr>
              <th className="px-4 py-2.5 text-2xs uppercase text-slate-400">{t.colName}</th>
              <th className="px-4 py-2.5 text-2xs uppercase text-slate-400">{t.inferredType}</th>
              <th className="px-4 py-2.5 text-2xs uppercase text-slate-400 text-right">{t.completeness}</th>
              <th className="px-4 py-2.5 text-2xs uppercase text-slate-400 text-right">{t.uniqueValues}</th>
              <th className="px-4 py-2.5 text-2xs uppercase text-slate-400">{t.sampleValues}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredColumns.map(col => {
              const nonEmp = col.totalCount - col.missingCount;
              const pct = col.totalCount > 0 ? Math.round((nonEmp / col.totalCount) * 100) : 0;

              return (
                <tr key={col.key} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5 text-slate-200 font-medium">
                    <div>{col.label}</div>
                    {col.key !== col.label && (
                      <div className="text-2xs text-slate-500">{col.key}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-2xs uppercase font-bold border ${
                        col.type === 'number'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                          : col.type === 'date'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                          : col.type === 'category'
                          ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                          : col.type === 'array'
                          ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                          : 'bg-white/[0.04] text-slate-400 border-white/[0.08]'
                      }`}
                    >
                      {col.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-300">
                    <div>%{pct}</div>
                    <div className="text-2xs text-slate-500">
                      {nonEmp.toLocaleString()} / {col.totalCount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-300 font-mono">
                    {col.uniqueCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 max-w-md truncate">
                    {col.type === 'number' && col.min !== undefined && col.max !== undefined ? (
                      <span className="text-slate-300">
                        Min: {col.min} | Maks: {col.max} | Ort: {col.avg}
                      </span>
                    ) : (
                      <span>
                        {col.topValues.slice(0, 4).map(tv => `${tv.value} (${tv.count})`).join(', ') || '-'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

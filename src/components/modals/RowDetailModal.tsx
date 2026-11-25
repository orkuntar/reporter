import React, { useState } from 'react';
import { X, Copy, Check, Search } from 'lucide-react';
import { Dataset, DataRow } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface RowDetailModalProps {
  row: DataRow | null;
  dataset: Dataset;
  onClose: () => void;
}

export const RowDetailModal: React.FC<RowDetailModalProps> = ({ row, dataset, onClose }) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [filterText, setFilterText] = useState('');

  if (!row) return null;

  const activeCols = dataset.columns.filter(c => !c.key.startsWith('_derived_'));
  const activeKeySet = new Set(activeCols.map(c => c.key));

  const issueKey = dataset.jiraFields?.keyCol ? row[dataset.jiraFields.keyCol] : row._id;
  const summary = dataset.jiraFields?.summaryCol ? row[dataset.jiraFields.summaryCol] : '';

  const handleCopyJson = () => {
    const filteredObj: Record<string, any> = {};
    activeCols.forEach(c => {
      filteredObj[c.key] = row[c.key];
    });
    navigator.clipboard.writeText(JSON.stringify(filteredObj, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show only selected/active columns
  const entries = activeCols.map(c => [c.key, row[c.key]] as [string, any]).filter(([k]) => activeKeySet.has(k));
  const filteredEntries = entries.filter(([k, v]) => {
    const q = filterText.toLowerCase();
    return k.toLowerCase().includes(q) || String(v ?? '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 select-none">
      <div className="bg-[#0f1219] border border-white/[0.12] rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center space-x-3">
            <span className="px-2 py-0.5 bg-cyan-950/50 text-cyan-300 border border-cyan-500/40 rounded text-xs font-mono font-bold">
              {issueKey}
            </span>
            <h2 className="text-sm font-semibold text-white font-mono truncate max-w-xl">
              {summary || t.recordDetail}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyJson}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-2xs font-mono text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-cyan-400" />}
              <span>{copied ? t.copied : t.copyJson}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search inside fields */}
        <div className="px-4 py-2 border-b border-white/[0.06] bg-[#0c0f16]">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder={t.searchAttributes}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full bg-[#141822] border border-white/[0.08] rounded text-xs text-slate-200 pl-8 pr-3 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Modal Body - Field Inspector */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {filteredEntries.map(([key, value]) => {
            let displayVal = '';
            let isLong = false;

            if (Array.isArray(value)) {
              displayVal = value.join(', ');
            } else if (value !== undefined && value !== null) {
              displayVal = String(value);
              isLong = displayVal.length > 80 || displayVal.includes('\n');
            }

            return (
              <div
                key={key}
                className="bg-[#121620] border border-white/[0.06] rounded p-2.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-mono uppercase text-slate-400 font-semibold tracking-wider">
                    {key}
                  </span>
                  {Array.isArray(value) && (
                    <span className="text-2xs text-purple-400">DİZİ [{value.length}]</span>
                  )}
                </div>

                {isLong ? (
                  <div className="bg-[#090b10] p-2.5 rounded border border-white/[0.04] text-slate-300 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed select-text">
                    {displayVal || '-'}
                  </div>
                ) : (
                  <div className="text-slate-200 text-xs font-mono select-text">
                    {displayVal || '-'}
                  </div>
                )}
              </div>
            );
          })}

          {filteredEntries.length === 0 && (
            <div className="text-center py-8 text-slate-500 font-mono text-xs">
              "{filterText}" kriterine uyan alan bulunamadı.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

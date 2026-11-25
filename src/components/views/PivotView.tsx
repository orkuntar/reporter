import React, { useState } from 'react';
import { Grid } from 'lucide-react';
import { ColumnMeta, Dataset, DataRow } from '../../types';
import { computePivotTable } from '../../core/analyticsEngine';
import { useLanguage } from '../../i18n/LanguageContext';

interface PivotViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
}

export const PivotView: React.FC<PivotViewProps> = ({ dataset, filteredRows }) => {
  const { t } = useLanguage();
  const isJira = dataset.sourceType === 'jira';

  const [rowColKey, setRowColKey] = useState<string>(
    dataset.jiraFields?.priorityCol || dataset.columns[0]?.key || ''
  );
  const [colColKey, setColColKey] = useState<string>(
    dataset.jiraFields?.statusCol || dataset.columns[1]?.key || ''
  );
  const [valColKey, setValColKey] = useState<string>('');
  const [aggregation, setAggregation] = useState<'count' | 'sum' | 'avg'>('count');

  const pivotData = computePivotTable(
    filteredRows,
    rowColKey,
    colColKey,
    valColKey || undefined,
    aggregation
  );

  const numericCols = dataset.columns.filter(c => c.type === 'number');

  let maxCellValue = 0;
  pivotData.rowLabels.forEach(r => {
    pivotData.colLabels.forEach(c => {
      const v = pivotData.matrix[r]?.[c] || 0;
      if (v > maxCellValue) maxCellValue = v;
    });
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090b10] overflow-hidden select-none">
      {/* Top Configuration Controls */}
      <div className="p-3 border-b border-white/[0.06] bg-[#0b0e14] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold text-cyan-400">
            <Grid className="w-3.5 h-3.5" />
            <span>{t.pivotTitle}</span>
          </div>

          <div className="flex items-center space-x-2 text-2xs font-mono">
            <span className="text-slate-400">{t.rowsAxis}</span>
            <select
              value={rowColKey}
              onChange={(e) => setRowColKey(e.target.value)}
              className="bg-[#141822] border border-white/[0.1] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
            >
              {dataset.columns.map(c => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <span className="text-slate-400 pl-2">{t.colsAxis}</span>
            <select
              value={colColKey}
              onChange={(e) => setColColKey(e.target.value)}
              className="bg-[#141822] border border-white/[0.1] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
            >
              {dataset.columns.map(c => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>

            <span className="text-slate-400 pl-2">{t.metricAxis}</span>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e.target.value as any)}
              className="bg-[#141822] border border-white/[0.1] text-xs text-cyan-300 rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="count">{t.countOfRecords}</option>
              <option value="sum">{t.sumOfValues}</option>
              <option value="avg">{t.avgOfValues}</option>
            </select>

            {aggregation !== 'count' && (
              <select
                value={valColKey}
                onChange={(e) => setValColKey(e.target.value)}
                className="bg-[#141822] border border-white/[0.1] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t.valueColumn} Seçiniz...</option>
                {numericCols.map(c => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="text-2xs font-mono text-slate-400">
          {t.grandTotal}: <span className="text-white font-bold">{pivotData.grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full border-collapse text-left text-xs font-mono">
          <thead className="sticky top-0 bg-[#0e121a] z-10 border-b border-white/[0.08]">
            <tr>
              <th className="px-3 py-2 text-2xs uppercase text-slate-400 border-r border-white/[0.06] bg-[#0c0f16]">
                {rowColKey} \ {colColKey}
              </th>
              {pivotData.colLabels.map(col => (
                <th
                  key={col}
                  className="px-3 py-2 text-2xs uppercase text-slate-300 border-r border-white/[0.04] text-right"
                >
                  {col}
                </th>
              ))}
              <th className="px-3 py-2 text-2xs uppercase text-cyan-400 text-right bg-[#0c0f16]">
                Toplam
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {pivotData.rowLabels.map(row => (
              <tr key={row} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2 text-slate-300 font-semibold border-r border-white/[0.06] bg-[#0c0f16]/60">
                  {row}
                </td>
                {pivotData.colLabels.map(col => {
                  const val = pivotData.matrix[row]?.[col] || 0;
                  const ratio = maxCellValue > 0 ? val / maxCellValue : 0;
                  return (
                    <td
                      key={col}
                      className="px-3 py-2 text-right border-r border-white/[0.04] text-slate-300"
                      style={{
                        backgroundColor: val > 0 ? `rgba(6, 182, 212, ${Math.min(0.35, ratio * 0.4)})` : undefined,
                      }}
                    >
                      {val > 0 ? val.toLocaleString() : '-'}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right font-bold text-white bg-[#0c0f16]/60">
                  {pivotData.rowTotals[row]?.toLocaleString() || 0}
                </td>
              </tr>
            ))}

            {/* Column Totals Row */}
            <tr className="bg-[#0c0f16] font-bold border-t-2 border-white/[0.08]">
              <td className="px-3 py-2 text-cyan-400">TOPLAM</td>
              {pivotData.colLabels.map(col => (
                <td key={col} className="px-3 py-2 text-right text-slate-200 border-r border-white/[0.04]">
                  {pivotData.colTotals[col]?.toLocaleString() || 0}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-cyan-400 font-bold">
                {pivotData.grandTotal.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

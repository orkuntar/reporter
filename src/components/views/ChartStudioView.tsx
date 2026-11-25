import React, { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  RotateCcw,
  FilePlus2,
  Calendar,
  Check,
  Pin
} from 'lucide-react';
import { ChartConfig, ChartType, ColumnMeta, Dataset, DataRow, DateGranularity } from '../../types';
import { ChartRenderer } from '../charts/ChartRenderer';
import { CuratedDataTable } from '../common/CuratedDataTable';
import { SearchableSelect } from '../common/SearchableSelect';
import { useLanguage } from '../../i18n/LanguageContext';

interface ChartStudioViewProps {
  dataset: Dataset;
  filteredRows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  onAddChartToComposer: (config: ChartConfig) => void;
  onPinToOverview: (config: ChartConfig) => void;
  onSelectRow: (row: DataRow) => void;
  onChartElementClick?: (columnKey: string, value: string) => void;
}

export const ChartStudioView: React.FC<ChartStudioViewProps> = ({
  dataset,
  filteredRows,
  columnMetaMap,
  onAddChartToComposer,
  onPinToOverview,
  onSelectRow,
  onChartElementClick,
}) => {
  const { t } = useLanguage();
  const isJira = dataset.sourceType === 'jira';

  const CHART_TYPES: { id: ChartType; label: string }[] = [
    { id: 'bar_vertical', label: t.chartBarVertical },
    { id: 'bar_horizontal', label: t.chartBarHorizontal },
    { id: 'bar_stacked', label: t.chartBarStacked },
    { id: 'donut', label: t.chartDonut },
    { id: 'line', label: t.chartLine },
    { id: 'area', label: t.chartArea },
    { id: 'radar', label: t.chartRadar },
    { id: 'treemap', label: t.chartTreemap },
    { id: 'scatter', label: t.chartScatter },
  ];

  // Initial config
  const [config, setConfig] = useState<ChartConfig>({
    id: `custom_${Date.now()}`,
    title: isJira ? 'Durum Kategorisine Göre Dağılım' : 'Dağılım Analizi',
    type: 'bar_vertical',
    xAxisCol: columnMetaMap.has('_derived_status_bucket')
      ? '_derived_status_bucket'
      : dataset.columns[0]?.key || '',
    aggregation: 'count',
    colorPalette: 'technical',
    sortBy: 'value_desc',
    dateGranularity: 'day',
    stackedSeries: false,
    topN: 10,
  });

  useEffect(() => {
    const activeSet = new Set(dataset.columns.map(c => c.key));
    setConfig(prev => {
      const nextX = activeSet.has(prev.xAxisCol)
        ? prev.xAxisCol
        : activeSet.has('_derived_status_bucket')
        ? '_derived_status_bucket'
        : dataset.columns[0]?.key || '';
      const nextY = prev.yAxisCol && activeSet.has(prev.yAxisCol) ? prev.yAxisCol : undefined;
      const nextGroup = prev.groupByCol && activeSet.has(prev.groupByCol) ? prev.groupByCol : undefined;
      if (nextX === prev.xAxisCol && nextY === prev.yAxisCol && nextGroup === prev.groupByCol) {
        return prev;
      }
      return {
        ...prev,
        xAxisCol: nextX,
        yAxisCol: nextY,
        groupByCol: nextGroup,
        includeSubValues: nextGroup === prev.groupByCol ? prev.includeSubValues : undefined,
      };
    });
  }, [dataset.columns]);

  const [notification, setNotification] = useState<string | null>(null);

  const numericCols = dataset.columns.filter(c => c.type === 'number');

  // Check if current X axis is a date column
  const xColMeta = columnMetaMap.get(config.xAxisCol);
  const isXDateCol = Boolean(
    xColMeta?.type === 'date' ||
    xColMeta?.isDateColumn ||
    config.xAxisCol.toLowerCase().includes('tarih') ||
    config.xAxisCol.toLowerCase().includes('oluşturulan') ||
    config.xAxisCol.toLowerCase().includes('güncellendi')
  );

  // Available values for secondary groupByCol
  const groupByValues = useMemo(() => {
    if (!config.groupByCol) return [];
    const meta = columnMetaMap.get(config.groupByCol);
    if (meta && meta.topValues.length > 0) {
      return meta.topValues.map(v => v.value);
    }
    const vals = new Set<string>();
    filteredRows.forEach(r => {
      const v = r[config.groupByCol!];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        vals.add(String(v).trim());
      }
    });
    return Array.from(vals).slice(0, 20);
  }, [config.groupByCol, columnMetaMap, filteredRows]);

  const handleApplyTemplate = (tpl: Partial<ChartConfig>) => {
    setConfig(prev => ({
      ...prev,
      includeSubValues: undefined,
      ...tpl,
      id: `custom_${Date.now()}`,
    }));
  };

  const handleXAxisChange = (newCol: string) => {
    const meta = columnMetaMap.get(newCol);
    const isDate = Boolean(
      meta?.type === 'date' ||
      meta?.isDateColumn ||
      newCol.toLowerCase().includes('tarih') ||
      newCol.toLowerCase().includes('oluşturulan') ||
      newCol.toLowerCase().includes('güncellendi')
    );

    setConfig(prev => ({
      ...prev,
      xAxisCol: newCol,
      dateGranularity: isDate ? (prev.dateGranularity === 'raw' ? 'day' : prev.dateGranularity || 'day') : 'raw',
      sortBy: isDate ? 'date_asc' : 'value_desc',
    }));
  };

  const handleToggleSubValue = (val: string) => {
    setConfig(prev => {
      const current = prev.includeSubValues || [];
      const next = current.includes(val)
        ? current.filter(v => v !== val)
        : [...current, val];
      return {
        ...prev,
        includeSubValues: next.length > 0 ? next : undefined,
      };
    });
  };

  const handleSaveToComposer = () => {
    onAddChartToComposer({ ...config, id: `composer_${Date.now()}` });
    setNotification('Grafik, Rapor Oluşturucu şablonuna eklendi');
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePinOverview = () => {
    onPinToOverview({ ...config, id: `pinned_${Date.now()}` });
    setNotification('Grafik, Genel Bakış panosuna sabitlendi');
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Control Inspector */}
      <div className="w-80 bg-[#0c0f16] border-r border-white/[0.06] p-4 flex flex-col justify-between overflow-y-auto select-none space-y-4">
        <div className="space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase text-cyan-400">
              <Sliders className="w-3.5 h-3.5" />
              <span>{t.studioControls}</span>
            </div>
            <button
              onClick={() =>
                setConfig({
                  id: `custom_${Date.now()}`,
                  title: 'Yeni Grafik',
                  type: 'bar_vertical',
                  xAxisCol: dataset.columns[0]?.key || '',
                  aggregation: 'count',
                  colorPalette: 'technical',
                  sortBy: 'value_desc',
                  dateGranularity: 'day',
                  topN: 10,
                })
              }
              className="text-2xs font-mono text-slate-400 hover:text-slate-200"
              title={t.reset}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Preset Templates */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              {t.quickTemplates}
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-2xs font-mono">
              {isJira && (
                <>
                  {(dataset.jiraFields?.startDateCol || dataset.jiraFields?.createdCol) &&
                    dataset.jiraFields?.statusCol && (
                      <button
                        onClick={() =>
                          handleApplyTemplate({
                            title: 'Tarih Bazlı Durum Trendi (Alankart)',
                            type: 'area',
                            xAxisCol: dataset.jiraFields?.startDateCol || dataset.jiraFields?.createdCol || '',
                            groupByCol: dataset.jiraFields?.statusCol,
                            dateGranularity: 'day',
                            sortBy: 'date_asc',
                            aggregation: 'count',
                            colorPalette: 'technical',
                          })
                        }
                        className="col-span-2 p-1.5 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 rounded text-left truncate text-cyan-300 font-semibold"
                      >
                        Tarih & Durum Trendi (Alankart)
                      </button>
                    )}
                  {columnMetaMap.has('_derived_status_bucket') && (
                    <button
                      onClick={() =>
                        handleApplyTemplate({
                          title: 'Durum Kategorisi Halka Grafiği',
                          type: 'donut',
                          xAxisCol: '_derived_status_bucket',
                          groupByCol: undefined,
                          aggregation: 'count',
                          sortBy: 'value_desc',
                          colorPalette: 'technical',
                        })
                      }
                      className="p-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded text-left truncate text-slate-300"
                    >
                      Durum Donut
                    </button>
                  )}
                  {dataset.jiraFields?.assigneeCol && columnMetaMap.has(dataset.jiraFields.assigneeCol) && (
                    <button
                      onClick={() =>
                        handleApplyTemplate({
                          title: 'Yazılımcı İş Yükü',
                          type: 'bar_horizontal',
                          xAxisCol: dataset.jiraFields?.assigneeCol || '',
                          groupByCol: undefined,
                          aggregation: 'count',
                          sortBy: 'value_desc',
                          colorPalette: 'technical',
                          topN: 12,
                        })
                      }
                      className="p-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded text-left truncate text-slate-300"
                    >
                      Yazılımcı Yükü
                    </button>
                  )}
                  {dataset.jiraFields?.priorityCol && columnMetaMap.has(dataset.jiraFields.priorityCol) && (
                    <button
                      onClick={() =>
                        handleApplyTemplate({
                          title: 'Öncelik Seviyeleri Dağılımı',
                          type: 'bar_vertical',
                          xAxisCol: dataset.jiraFields?.priorityCol || '',
                          groupByCol: undefined,
                          aggregation: 'count',
                          sortBy: 'value_desc',
                          colorPalette: 'warm',
                        })
                      }
                      className="p-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded text-left truncate text-slate-300"
                    >
                      Öncelik Seviyeleri
                    </button>
                  )}
                  {dataset.jiraFields?.departmentCol && columnMetaMap.has(dataset.jiraFields.departmentCol) && (
                    <button
                      onClick={() =>
                        handleApplyTemplate({
                          title: 'Departman Talep Hacmi',
                          type: 'bar_horizontal',
                          xAxisCol: dataset.jiraFields?.departmentCol || '',
                          groupByCol: undefined,
                          aggregation: 'count',
                          sortBy: 'value_desc',
                          colorPalette: 'emerald',
                          topN: 8,
                        })
                      }
                      className="p-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] rounded text-left truncate text-slate-300"
                    >
                      Departman Hacmi
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chart Title */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
              {t.chartTitle}
            </label>
            <input
              type="text"
              value={config.title}
              onChange={(e) => setConfig({ ...config, title: e.target.value })}
              className="w-full bg-[#141822] border border-white/[0.08] text-xs text-white rounded px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Chart Type Selection */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
              {t.visualFormat}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {CHART_TYPES.map(typeItem => (
                <button
                  key={typeItem.id}
                  onClick={() => setConfig({ ...config, type: typeItem.id })}
                  className={`p-1.5 rounded text-2xs font-mono text-center border transition-all truncate ${
                    config.type === typeItem.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-semibold'
                      : 'bg-white/[0.02] text-slate-400 border-white/[0.06] hover:bg-white/[0.05]'
                  }`}
                >
                  {typeItem.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension (X-Axis) */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
              {t.primaryDimension}
            </label>
            <SearchableSelect
              value={config.xAxisCol}
              onChange={(val) => handleXAxisChange(val)}
              options={dataset.columns.map(c => ({
                value: c.key,
                label: c.label,
                subLabel: c.type
              }))}
              searchPlaceholder="Kolon ara..."
              triggerClassName="w-full bg-[#141822] border border-white/[0.08] hover:border-white/20 text-xs text-slate-200 rounded px-2.5 py-1.5 font-mono"
            />
          </div>

          {/* Date Granularity (shown automatically when X-Axis is a date column) */}
          {isXDateCol && (
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded p-2.5 space-y-1.5">
              <div className="flex items-center space-x-1.5 text-2xs font-mono uppercase text-cyan-300 font-semibold">
                <Calendar className="w-3 h-3" />
                <span>Tarih Gruplama Periyodu</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {([
                  { id: 'day', label: 'Günlük' },
                  { id: 'week', label: 'Haftalık' },
                  { id: 'month', label: 'Aylık' },
                  { id: 'year', label: 'Yıllık' },
                ] as { id: DateGranularity; label: string }[]).map(g => (
                  <button
                    key={g.id}
                    onClick={() => setConfig({ ...config, dateGranularity: g.id, sortBy: 'date_asc' })}
                    className={`py-1 rounded text-2xs font-mono border transition-colors ${
                      (config.dateGranularity || 'day') === g.id
                        ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 font-bold'
                        : 'bg-[#141822] text-slate-400 border-white/[0.06] hover:text-slate-200'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aggregation Function */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
              {t.metricAggregation}
            </label>
            <select
              value={config.aggregation}
              onChange={(e) => setConfig({ ...config, aggregation: e.target.value as any })}
              className="w-full bg-[#141822] border border-white/[0.08] text-xs text-cyan-300 rounded px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="count">{t.countOfRecords}</option>
              <option value="sum">{t.sumOfValues}</option>
              <option value="avg">{t.avgOfValues}</option>
              <option value="min">{t.minOfValues}</option>
              <option value="max">{t.maxOfValues}</option>
            </select>
          </div>

          {/* Metric Field (Y-Axis) */}
          {config.aggregation !== 'count' && (
            <div>
              <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                {t.valueColumn}
              </label>
              <SearchableSelect
                value={config.yAxisCol || ''}
                onChange={(val) => setConfig({ ...config, yAxisCol: val })}
                options={numericCols.map(c => ({ value: c.key, label: c.label, subLabel: 'sayı' }))}
                placeholder="Seçiniz..."
                searchPlaceholder="Sayısal kolon ara..."
                triggerClassName="w-full bg-[#141822] border border-white/[0.08] hover:border-white/20 text-xs text-slate-200 rounded px-2.5 py-1.5 font-mono"
              />
            </div>
          )}

          {/* Secondary Breakdown / Group By */}
          <div>
            <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
              {t.secondaryBreakdown}
            </label>
            <SearchableSelect
              value={config.groupByCol || ''}
              onChange={(val) =>
                setConfig({
                  ...config,
                  groupByCol: val || undefined,
                  includeSubValues: undefined,
                })
              }
              options={[
                { value: '', label: '(Yok - Tekil Seri)' },
                ...dataset.columns
                  .filter(c => c.type === 'category' || (c.uniqueCount > 0 && c.uniqueCount <= 30))
                  .map(c => ({ value: c.key, label: c.label, subLabel: `${c.uniqueCount} değer` }))
              ]}
              searchPlaceholder="Kırılım kolonu ara..."
              triggerClassName="w-full bg-[#141822] border border-white/[0.08] hover:border-white/20 text-xs text-slate-200 rounded px-2.5 py-1.5 font-mono"
            />

            {/* Sub-series selective filter pills (e.g. pick only Yapılacaklar & Tamam) */}
            {config.groupByCol && groupByValues.length > 0 && (
              <div className="mt-2 bg-[#121620] border border-white/[0.06] rounded p-2 space-y-1.5">
                <div className="flex items-center justify-between text-2xs font-mono text-slate-400">
                  <span>Seri Filtresi (İsteğe Bağlı):</span>
                  {config.includeSubValues && (
                    <button
                      onClick={() => setConfig({ ...config, includeSubValues: undefined })}
                      className="text-cyan-400 hover:underline"
                    >
                      Tümü
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {groupByValues.map(val => {
                    const isSelected = !config.includeSubValues || config.includeSubValues.includes(val);
                    const isExplicit = config.includeSubValues?.includes(val);
                    return (
                      <button
                        key={val}
                        onClick={() => handleToggleSubValue(val)}
                        className={`px-1.5 py-0.5 rounded text-2xs font-mono border flex items-center space-x-1 transition-colors ${
                          isExplicit
                            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                            : isSelected
                            ? 'bg-white/[0.04] text-slate-300 border-white/[0.08]'
                            : 'bg-transparent text-slate-500 border-white/[0.04] opacity-50'
                        }`}
                      >
                        {isExplicit && <Check className="w-2.5 h-2.5 text-cyan-400" />}
                        <span className="truncate max-w-[110px]">{val}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stacked Toggle for Area / Horizontal Bar */}
            {config.groupByCol && (config.type === 'area' || config.type === 'bar_horizontal') && (
              <label className="mt-2 flex items-center space-x-2 text-2xs font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.stackedSeries)}
                  onChange={(e) => setConfig({ ...config, stackedSeries: e.target.checked })}
                  className="rounded border-white/20 bg-transparent text-cyan-500"
                />
                <span>Yığılmış (Stacked) Görünüm</span>
              </label>
            )}
          </div>

          {/* Palette, Sort & Limit */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                {t.colorTheme}
              </label>
              <select
                value={config.colorPalette || 'technical'}
                onChange={(e) => setConfig({ ...config, colorPalette: e.target.value as any })}
                className="w-full bg-[#141822] border border-white/[0.08] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
              >
                <option value="technical">Teknik (Cyan/Indigo)</option>
                <option value="monochrome">Monokrom (Gri/Beyaz)</option>
                <option value="cyber">Siber (Mor/Cyan)</option>
                <option value="emerald">Zümrüt (Yeşil)</option>
                <option value="warm">Sıcak (Kehribar)</option>
              </select>
            </div>

            <div>
              <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Sıralama
              </label>
              <select
                value={config.sortBy || 'value_desc'}
                onChange={(e) => setConfig({ ...config, sortBy: e.target.value as any })}
                className="w-full bg-[#141822] border border-white/[0.08] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
              >
                <option value="date_asc">Kronolojik (Tarih)</option>
                <option value="value_desc">Değer (Azalan)</option>
                <option value="value_asc">Değer (Artan)</option>
                <option value="label_asc">Etiket (A-Z)</option>
              </select>
            </div>
          </div>

          {!isXDateCol && (
            <div>
              <label className="text-2xs font-mono uppercase tracking-wider text-slate-400 block mb-1">
                {t.topNLimit}
              </label>
              <select
                value={config.topN || 10}
                onChange={(e) => setConfig({ ...config, topN: parseInt(e.target.value, 10) })}
                className="w-full bg-[#141822] border border-white/[0.08] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
              >
                <option value={5}>İlk 5</option>
                <option value={8}>İlk 8</option>
                <option value={10}>İlk 10</option>
                <option value={15}>İlk 15</option>
                <option value={25}>İlk 25</option>
              </select>
            </div>
          )}
        </div>

        {/* Actions: Pin to Overview & Add to Composer */}
        <div className="pt-2 border-t border-white/[0.06] space-y-2">
          <button
            onClick={handlePinOverview}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-2xs font-mono uppercase tracking-wider text-emerald-300 bg-emerald-950/35 hover:bg-emerald-900/45 border border-emerald-500/40 rounded transition-colors"
          >
            <Pin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Genel Bakışa Sabitle</span>
          </button>

          <button
            onClick={handleSaveToComposer}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-2xs font-mono uppercase tracking-wider text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 rounded transition-colors"
          >
            <FilePlus2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.addToReportComposer}</span>
          </button>
        </div>
      </div>

      {/* Right Canvas / Preview & Curated Raw Data Table */}
      <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto space-y-6">
        <div className="bg-[#0f1219] border border-white/[0.08] rounded-md p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
            <div>
              <span className="text-2xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
                {t.liveStudioCanvas}
              </span>
              <h2 className="text-lg font-bold text-white mt-0.5">{config.title}</h2>
            </div>

            <div className="flex items-center space-x-2 text-2xs font-mono text-slate-400">
              <span className="bg-white/[0.04] px-2 py-1 rounded border border-white/[0.08]">
                X: {config.xAxisCol}
              </span>
              {config.groupByCol && (
                <span className="bg-cyan-950/40 text-cyan-300 px-2 py-1 rounded border border-cyan-500/30">
                  GRUP: {config.groupByCol}
                </span>
              )}
              <span className="bg-white/[0.04] px-2 py-1 rounded border border-white/[0.08]">
                {filteredRows.length} aktif kayıt
              </span>
            </div>
          </div>

          {notification && (
            <div className="mb-4 bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-mono px-3 py-2 rounded flex items-center justify-between animate-in fade-in">
              <span>{notification}</span>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center min-h-[380px]">
            <ChartRenderer
              config={config}
              rows={filteredRows}
              columnMetaMap={columnMetaMap}
              height={400}
              onElementClick={onChartElementClick}
            />
          </div>
        </div>

        {/* Curated Raw Data Table in Studio */}
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

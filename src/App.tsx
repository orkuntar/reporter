import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { DateFilterBar } from './components/filter/DateFilterBar';
import { ActiveFilterBar } from './components/filter/ActiveFilterBar';
import { QueryBuilder } from './components/filter/QueryBuilder';
import { QuickFacets } from './components/filter/QuickFacets';
import { OverviewView } from './components/views/OverviewView';
import { ChartStudioView } from './components/views/ChartStudioView';
import { JiraAnalyticsView } from './components/views/JiraAnalyticsView';
import { AuditReportView } from './components/views/AuditReportView';
import { CompletedReportView } from './components/views/CompletedReportView';
import { DataGridView } from './components/views/DataGridView';
import { PivotView } from './components/views/PivotView';
import { ComposerView } from './components/views/ComposerView';
import { SchemaView } from './components/views/SchemaView';
import { RowDetailModal } from './components/modals/RowDetailModal';
import { ExportModal } from './components/modals/ExportModal';
import { ImportOptionsModal } from './components/modals/ImportOptionsModal';
import { DatasetManagerModal } from './components/modals/DatasetManagerModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { ColumnSelectionModal } from './components/modals/ColumnSelectionModal';
import {
  parseCsvFile,
  upsertDataset,
  computeColumnMetadata,
  decodeCsvArrayBuffer,
  applyDatasetColumnSelection,
  ensureDatasetColumnModel,
} from './core/parser';
import { filterDataset } from './core/filterEngine';
import { loadSavedDatasets, persistDataset, removeSavedDataset } from './core/storage';
import { AppView, ChartConfig, Dataset, DataRow, DateFilterState, FilterGroup, FilterPreset } from './types';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { UploadCloud, FileSpreadsheet, HardDrive, AlertCircle, ShieldCheck } from 'lucide-react';

interface ComposerState {
  charts: ChartConfig[];
  title: string;
  notes: string;
}

function getDefaultComposerCharts(ds: Dataset): ChartConfig[] {
  const activeSet = new Set(ds.columns.map(c => c.key));
  const charts: ChartConfig[] = [];

  if (ds.jiraFields?.statusCol && activeSet.has(ds.jiraFields.statusCol)) {
    charts.push({
      id: 'c1',
      title: 'İş Akış Durum Dağılımı',
      type: 'bar_vertical',
      xAxisCol: ds.jiraFields.statusCol,
      aggregation: 'count',
      colorPalette: 'technical',
      sortBy: 'value_desc',
      topN: 10,
    });
  }
  if (ds.jiraFields?.priorityCol && activeSet.has(ds.jiraFields.priorityCol)) {
    charts.push({
      id: 'c2',
      title: 'Öncelik Seviyeleri Dağılımı',
      type: 'donut',
      xAxisCol: ds.jiraFields.priorityCol,
      aggregation: 'count',
      colorPalette: 'warm',
    });
  }
  if (activeSet.has('_derived_lead_time_days')) {
    charts.push({
      id: 'c3',
      title: 'Çözüm Süresi (Gün)',
      type: 'bar_vertical',
      xAxisCol: '_derived_lead_time_days',
      aggregation: 'count',
      colorPalette: 'emerald',
      topN: 10,
    });
  }
  if (ds.jiraFields?.assigneeCol && activeSet.has(ds.jiraFields.assigneeCol)) {
    charts.push({
      id: 'c4',
      title: 'Yazılımcı İş Dağılımı',
      type: 'bar_horizontal',
      xAxisCol: ds.jiraFields.assigneeCol,
      aggregation: 'count',
      colorPalette: 'cyber',
      topN: 12,
    });
  }

  if (charts.length > 0) return charts;

  const fallbackCols = ds.columns.filter(c => !c.key.startsWith('_derived_'));
  const firstCol = fallbackCols[0]?.key || ds.columns[0]?.key || '';
  const secondCol = fallbackCols[1]?.key || firstCol;
  const fallback: ChartConfig[] = [];
  if (firstCol) {
    fallback.push({
      id: 'c1',
      title: 'Birincil Kategori Dağılımı',
      type: 'bar_vertical',
      xAxisCol: firstCol,
      aggregation: 'count',
      colorPalette: 'technical',
    });
  }
  if (secondCol) {
    fallback.push({
      id: 'c2',
      title: 'Oransal Dağılım',
      type: 'donut',
      xAxisCol: secondCol,
      aggregation: 'count',
      colorPalette: 'cyber',
    });
  }
  return fallback;
}

const MainApplication: React.FC = () => {
  const electronAPI = (window as any).electronAPI;
  const { t } = useLanguage();
  const { toggleTheme } = useTheme();

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('reporter_active_dataset_id');
    } catch {
      return null;
    }
  });
  const [initialized, setInitialized] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upsertNotification, setUpsertNotification] = useState<string | null>(null);

  // Active Navigation View
  const [activeView, setActiveView] = useState<AppView>('overview');

  // Filter States
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>({
    id: 'fg_root',
    logicalOperator: 'AND',
    rules: [],
  });
  const [quickFacets, setQuickFacets] = useState<Record<string, string[]>>({});
  
  // Dedicated Date Filter State
  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    baselineCol: 'Özel alan (Başlangıç tarihi)',
    startDate: '',
    endDate: '',
    workStartedFilter: 'all',
    dueFilter: 'all',
  });

  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    try {
      const saved = localStorage.getItem('reporter_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persistent Composer State per Dataset
  const [composerByDataset, setComposerByDataset] = useState<Record<string, ComposerState>>(() => {
    try {
      const saved = localStorage.getItem('reporter_composer_layouts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persistent Pinned Overview Charts per Dataset
  const [pinnedByDataset, setPinnedByDataset] = useState<Record<string, ChartConfig[]>>(() => {
    try {
      const saved = localStorage.getItem('reporter_pinned_charts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modals & Collapsible Panels
  const [selectedRow, setSelectedRow] = useState<DataRow | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [stagedIncomingDataset, setStagedIncomingDataset] = useState<Dataset | null>(null);
  const [importOptionsOpen, setImportOptionsOpen] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [columnModalMode, setColumnModalMode] = useState<'import' | 'edit'>('edit');
  const [columnModalInitialTab, setColumnModalInitialTab] = useState<'columns' | 'mapping'>('columns');
  const [columnModalDataset, setColumnModalDataset] = useState<Dataset | null>(null);
  const [datasetManagerOpen, setDatasetManagerOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('reporter_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [facetsCollapsed, setFacetsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('reporter_facets_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Global Ctrl+K / Cmd+K shortcut for Command Palette
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('reporter_sidebar_collapsed', String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('reporter_facets_collapsed', String(facetsCollapsed));
    } catch {
      // ignore
    }
  }, [facetsCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('reporter_composer_layouts', JSON.stringify(composerByDataset));
    } catch {
      // ignore
    }
  }, [composerByDataset]);

  useEffect(() => {
    try {
      localStorage.setItem('reporter_pinned_charts', JSON.stringify(pinnedByDataset));
    } catch {
      // ignore
    }
  }, [pinnedByDataset]);

  // Resolve current active dataset
  const dataset = useMemo(() => {
    if (datasets.length === 0) return null;
    return datasets.find(d => d.id === activeDatasetId) || datasets[0];
  }, [datasets, activeDatasetId]);

  useEffect(() => {
    if (dataset?.id) {
      try {
        localStorage.setItem('reporter_active_dataset_id', dataset.id);
      } catch {
        // ignore
      }
    }
  }, [dataset?.id]);

  // Column Map for quick lookup
  const columnMetaMap = useMemo(() => {
    if (!dataset) return new Map();
    return new Map(dataset.columns.map(c => [c.key, c]));
  }, [dataset]);

  // Compute filtered dataset strictly using active/checked columns
  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    return filterDataset(
      dataset.rows,
      filterGroup,
      undefined,
      quickFacets,
      columnMetaMap,
      dateFilter,
      dataset.jiraFields?.workStartDateCol,
      dataset.jiraFields?.dueCol
    );
  }, [dataset, filterGroup, quickFacets, columnMetaMap, dateFilter]);

  const activeComposer: ComposerState = useMemo(() => {
    if (!dataset) {
      return { charts: [], title: '', notes: '' };
    }
    const existing = composerByDataset[dataset.id];
    if (existing) return existing;
    return {
      charts: getDefaultComposerCharts(dataset),
      title: `${dataset.name} — Yönetici Analiz Raporu`,
      notes: `Aktif veri kümesi kayıtlarından derlenmiş kapsamlı analiz raporu.`,
    };
  }, [dataset, composerByDataset]);

  const activePinnedCharts = useMemo(() => {
    if (!dataset) return [];
    return pinnedByDataset[dataset.id] || [];
  }, [dataset, pinnedByDataset]);

  const updateActiveComposer = useCallback((partial: Partial<ComposerState>) => {
    if (!dataset) return;
    setComposerByDataset(prev => {
      const current = prev[dataset.id] || {
        charts: getDefaultComposerCharts(dataset),
        title: `${dataset.name} — Yönetici Analiz Raporu`,
        notes: `Aktif veri kümesi kayıtlarından derlenmiş kapsamlı analiz raporu.`,
      };
      return {
        ...prev,
        [dataset.id]: { ...current, ...partial },
      };
    });
  }, [dataset]);

  // Calculate active filter count
  const isDateFilterActive = Boolean(
    dateFilter.startDate ||
    dateFilter.endDate ||
    dateFilter.workStartedFilter !== 'all' ||
    dateFilter.dueFilter !== 'all'
  );

  const activeFilterCount =
    filterGroup.rules.length +
    Object.values(quickFacets).reduce((acc, curr) => acc + (curr ? curr.length : 0), 0) +
    (isDateFilterActive ? 1 : 0);

  useEffect(() => {
    try {
      localStorage.setItem('reporter_presets', JSON.stringify(presets));
    } catch (e) {
      console.error(e);
    }
  }, [presets]);

  const resetFiltersForDataset = useCallback((ds: Dataset) => {
    const baseCol = ds.jiraFields?.startDateCol || ds.columns.find(c => c.type === 'date')?.key || ds.columns[0]?.key || '';
    setDateFilter({
      baselineCol: baseCol,
      startDate: '',
      endDate: '',
      workStartedFilter: 'all',
      dueFilter: 'all',
    });
    setFilterGroup({ id: 'fg_root', logicalOperator: 'AND', rules: [] });
    setQuickFacets({});
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setDateFilter(prev => ({
      ...prev,
      startDate: '',
      endDate: '',
      workStartedFilter: 'all',
      dueFilter: 'all',
    }));
    setFilterGroup({ id: 'fg_root', logicalOperator: 'AND', rules: [] });
    setQuickFacets({});
  }, []);

  const showNotice = (msg: string) => {
    setUpsertNotification(msg);
    setTimeout(() => setUpsertNotification(null), 6000);
  };

  // Switch active dataset
  const handleSelectDataset = useCallback((id: string) => {
    const target = datasets.find(d => d.id === id);
    if (!target) return;
    setActiveDatasetId(target.id);
    resetFiltersForDataset(target);
    showNotice(`Aktif veri seti değiştirildi: "${target.name}" (${target.rows.length.toLocaleString()} kayıt)`);
  }, [datasets, resetFiltersForDataset]);

  // Prune filters & custom charts referencing unchecked columns on active dataset
  const pruneStateForDatasetColumns = useCallback((updatedDs: Dataset) => {
    const activeKeySet = new Set(updatedDs.columns.map(c => c.key));

    setQuickFacets(prev => {
      const next: Record<string, string[]> = {};
      Object.entries(prev).forEach(([k, vals]) => {
        if (activeKeySet.has(k)) next[k] = vals;
      });
      return next;
    });

    setFilterGroup(prev => ({
      ...prev,
      rules: prev.rules.filter(r => activeKeySet.has(r.column)),
    }));

    setDateFilter(prev => {
      const nextBaseline = activeKeySet.has(prev.baselineCol)
        ? prev.baselineCol
        : updatedDs.jiraFields?.startDateCol ||
          updatedDs.columns.find(c => c.type === 'date' || c.isDateColumn)?.key ||
          updatedDs.columns[0]?.key ||
          '';
      return {
        baselineCol: nextBaseline,
        startDate: activeKeySet.has(prev.baselineCol) ? prev.startDate : '',
        endDate: activeKeySet.has(prev.baselineCol) ? prev.endDate : '',
        workStartedFilter: updatedDs.jiraFields?.workStartDateCol ? prev.workStartedFilter : 'all',
        dueFilter: updatedDs.jiraFields?.dueCol ? prev.dueFilter : 'all',
      };
    });

    setPinnedByDataset(prev => {
      const existing = prev[updatedDs.id];
      if (!existing) return prev;
      return {
        ...prev,
        [updatedDs.id]: existing.filter(
          c => activeKeySet.has(c.xAxisCol) && (!c.groupByCol || activeKeySet.has(c.groupByCol))
        ),
      };
    });

    setComposerByDataset(prev => {
      const existing = prev[updatedDs.id];
      if (!existing) return prev;
      return {
        ...prev,
        [updatedDs.id]: {
          ...existing,
          charts: existing.charts.filter(
            c => activeKeySet.has(c.xAxisCol) && (!c.groupByCol || activeKeySet.has(c.groupByCol))
          ),
        },
      };
    });
  }, []);

  // Open Column Selection / Field Mapping modal for an existing dataset
  const handleOpenColumnSelection = useCallback(
    (target?: Dataset | null, tab: 'columns' | 'mapping' = 'columns') => {
      const ds = target || dataset;
      if (!ds) return;
      setColumnModalDataset(ensureDatasetColumnModel(ds));
      setColumnModalMode('edit');
      setColumnModalInitialTab(tab);
      setColumnModalOpen(true);
    },
    [dataset]
  );

  // Process incoming dataset: let the client choose columns and main filter groups
  const handleProcessIncomingDataset = useCallback(async (incoming: Dataset) => {
    setColumnModalDataset(ensureDatasetColumnModel(incoming));
    setColumnModalMode('import');
    setColumnModalInitialTab('columns');
    setColumnModalOpen(true);
  }, []);

  // Confirm column selection & main field mappings (both for import and for loaded dataset)
  const handleConfirmColumnSelection = async (
    selectedKeys: string[],
    customName?: string,
    fieldMapping?: Dataset['jiraFields']
  ) => {
    if (!columnModalDataset) return;
    const namedDataset: Dataset = customName?.trim()
      ? { ...columnModalDataset, name: customName.trim() }
      : columnModalDataset;
    const configured = applyDatasetColumnSelection(namedDataset, selectedKeys, fieldMapping);

    setColumnModalOpen(false);
    setColumnModalDataset(null);

    if (columnModalMode === 'import') {
      if (dataset) {
        setStagedIncomingDataset(configured);
        setImportOptionsOpen(true);
      } else {
        await persistDataset(configured);
        setDatasets([configured]);
        setActiveDatasetId(configured.id);
        resetFiltersForDataset(configured);
        setActiveView('overview');
        showNotice(
          `"${configured.name}" ${configured.selectedColumnKeys?.length || configured.columns.length} seçili kolon ile yüklendi.`
        );
      }
      return;
    }

    // Editing columns / mappings of an already loaded dataset
    await persistDataset(configured);
    setDatasets(prev => prev.map(d => (d.id === configured.id ? configured : d)));
    if (configured.id === activeDatasetId) {
      pruneStateForDatasetColumns(configured);
      if (configured.sourceType !== 'jira' && (activeView === 'jira_analytics' || activeView === 'audit_report')) {
        setActiveView('overview');
      }
    }
    showNotice(
      `"${configured.name}" güncellendi: ${configured.selectedColumnKeys?.length || configured.columns.length} aktif kolon ve atanan ana alanlar devrede.`
    );
  };

  // Option 1: Save incoming CSV as brand new dataset & switch to it
  const handleConfirmAddNew = async (customName?: string) => {
    if (!stagedIncomingDataset) return;
    const newDs: Dataset = {
      ...stagedIncomingDataset,
      name: customName?.trim() || stagedIncomingDataset.name,
    };
    await persistDataset(newDs);
    setDatasets(prev => [newDs, ...prev]);
    setActiveDatasetId(newDs.id);
    resetFiltersForDataset(newDs);
    setImportOptionsOpen(false);
    setStagedIncomingDataset(null);
    showNotice(`"${newDs.name}" yeni veri seti olarak kaydedildi ve açıldı (${newDs.rows.length.toLocaleString()} benzersiz kayıt).`);
  };

  // Option 2: Upsert into active dataset
  const handleConfirmMerge = async () => {
    if (!dataset || !stagedIncomingDataset) return;
    const result = upsertDataset(dataset, stagedIncomingDataset);
    await persistDataset(result.dataset);
    setDatasets(prev => prev.map(d => (d.id === dataset.id ? result.dataset : d)));
    setImportOptionsOpen(false);
    setStagedIncomingDataset(null);

    showNotice(
      `${t.keyUpsertSuccess} ${result.updatedCount} ${t.keyUpdatedBadge}, ${result.insertedCount} ${t.keyInsertedBadge} (Toplam: ${result.totalCount} benzersiz kayıt, ${t.keyZeroDuplicates}).`
    );
  };

  // Option 3: Replace current dataset
  const handleConfirmReplace = async (customName?: string) => {
    if (!stagedIncomingDataset) return;
    if (dataset) {
      await removeSavedDataset(dataset.id);
    }
    const newDs: Dataset = {
      ...stagedIncomingDataset,
      name: customName?.trim() || stagedIncomingDataset.name,
    };
    await persistDataset(newDs);
    setDatasets(prev => [newDs, ...prev.filter(d => d.id !== dataset?.id)]);
    setActiveDatasetId(newDs.id);
    resetFiltersForDataset(newDs);
    setImportOptionsOpen(false);
    setStagedIncomingDataset(null);
    showNotice(`Veri seti "${newDs.name}" ile değiştirildi (${newDs.rows.length.toLocaleString()} kayıt).`);
  };

  // Save current filtered scope as a new dataset inside app
  const handleSaveFilteredAsNewDataset = async (name: string) => {
    if (!dataset) return;
    const norm = ensureDatasetColumnModel(dataset);
    const clonedRows = filteredRows.map((r, i) => ({ ...r, _id: `row_${i + 1}` }));
    const fullKeys = (norm.allColumns || norm.columns).map(c => c.key);
    const recomputedAllCols = computeColumnMetadata(clonedRows, fullKeys);
    const selectedKeys = norm.selectedColumnKeys || norm.columns.filter(c => !c.key.startsWith('_derived_')).map(c => c.key);

    const newDs = applyDatasetColumnSelection(
      {
        ...norm,
        id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        sourceFile: `${norm.sourceFile} (Filtrelenmiş)`,
        importedAt: new Date().toISOString(),
        rows: clonedRows,
        allColumns: recomputedAllCols,
        columns: recomputedAllCols,
      },
      selectedKeys
    );

    await persistDataset(newDs);
    setDatasets(prev => [newDs, ...prev]);
    setActiveDatasetId(newDs.id);
    resetFiltersForDataset(newDs);
    setDatasetManagerOpen(false);
    showNotice(`"${name}" veri seti kaydedildi ve açıldı (${clonedRows.length.toLocaleString()} kayıt).`);
  };

  // Rename saved dataset
  const handleRenameDataset = async (id: string, newName: string) => {
    const target = datasets.find(d => d.id === id);
    if (!target) return;
    const updated = { ...target, name: newName };
    await persistDataset(updated);
    setDatasets(prev => prev.map(d => (d.id === id ? updated : d)));
  };

  // Delete saved dataset
  const handleDeleteDataset = async (id: string) => {
    await removeSavedDataset(id);
    const remaining = datasets.filter(d => d.id !== id);
    setDatasets(remaining);
    if (activeDatasetId === id) {
      const next = remaining[0] || null;
      setActiveDatasetId(next ? next.id : null);
      if (next) {
        resetFiltersForDataset(next);
      }
    }
  };

  // Load Desktop Jira CSV
  const handleLoadDesktopJira = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let fileData = null;
      if (electronAPI?.getDesktopJira) {
        fileData = await electronAPI.getDesktopJira();
      }

      if (fileData && fileData.content) {
        const ds = parseCsvFile(fileData.content, fileData.fileName || 'Jira (2).csv', fileData.fileSize || 432924);
        await handleProcessIncomingDataset(ds);
      } else {
        const res = await fetch('./sample-data/Jira(2).csv');
        if (res.ok) {
          const text = await res.text();
          const ds = parseCsvFile(text, 'Jira (2).csv', text.length);
          await handleProcessIncomingDataset(ds);
        } else {
          setError('Masaüstünde Jira (2).csv bulunamadı. Lütfen CSV İçe Aktar butonunu kullanarak dosyanızı seçin.');
        }
      }
    } catch (err: any) {
      setError(`Jira verisi yüklenirken hata oluştu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [electronAPI, handleProcessIncomingDataset]);

  // Initial Startup
  useEffect(() => {
    if (initialized) return;
    (async () => {
      setLoading(true);
      try {
        const savedRaw = await loadSavedDatasets();
        const saved = savedRaw.map(ensureDatasetColumnModel);
        if (saved.length > 0) {
          setDatasets(saved);
          const storedActive = localStorage.getItem('reporter_active_dataset_id');
          const initialDs = saved.find(d => d.id === storedActive) || saved[0];
          setActiveDatasetId(initialDs.id);
          resetFiltersForDataset(initialDs);
        } else {
          let fileData = null;
          if (electronAPI?.getDesktopJira) {
            fileData = await electronAPI.getDesktopJira();
          }
          if (fileData && fileData.content) {
            const ds = parseCsvFile(fileData.content, fileData.fileName || 'Jira (2).csv', fileData.fileSize || 432924);
            await persistDataset(ds);
            setDatasets([ds]);
            setActiveDatasetId(ds.id);
            resetFiltersForDataset(ds);
          } else {
            const res = await fetch('./sample-data/Jira(2).csv').catch(() => null);
            if (res && res.ok) {
              const text = await res.text();
              const ds = parseCsvFile(text, 'Jira (2).csv', text.length);
              await persistDataset(ds);
              setDatasets([ds]);
              setActiveDatasetId(ds.id);
              resetFiltersForDataset(ds);
            }
          }
        }
      } catch (err: any) {
        setError(`Başlangıç yükleme hatası: ${err.message}`);
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    })();
  }, [initialized, electronAPI, resetFiltersForDataset]);

  // Handle Import CSV Dialog
  const handleImportClick = async () => {
    setLoading(true);
    setError(null);
    try {
      if (electronAPI?.openFileDialog) {
        const file = await electronAPI.openFileDialog();
        if (file && file.content) {
          const ds = parseCsvFile(file.content, file.fileName, file.fileSize);
          await handleProcessIncomingDataset(ds);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.tsv,.txt';
        input.onchange = async (e: any) => {
          const f = e.target.files?.[0];
          if (f) {
            const buf = await f.arrayBuffer();
            const text = decodeCsvArrayBuffer(buf);
            const ds = parseCsvFile(text, f.name, f.size);
            await handleProcessIncomingDataset(ds);
          }
        };
        input.click();
      }
    } catch (err: any) {
      setError(`Dosya içe aktarılamadı: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Drag and Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setLoading(true);
      setError(null);
      try {
        const buf = await file.arrayBuffer();
        const text = decodeCsvArrayBuffer(buf);
        const ds = parseCsvFile(text, file.name, file.size);
        await handleProcessIncomingDataset(ds);
      } catch (err: any) {
        setError(`Sürüklenen CSV ayrıştırılamadı: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  // Quick Facet & Cross-Filter Handlers
  const handleToggleFacetValue = useCallback((colKey: string, value: string) => {
    setQuickFacets(prev => {
      const current = prev[colKey] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[colKey];
        return copy;
      }
      return { ...prev, [colKey]: updated };
    });
  }, []);

  const handleClearFacetColumn = (colKey: string) => {
    setQuickFacets(prev => {
      const copy = { ...prev };
      delete copy[colKey];
      return copy;
    });
  };

  const handleClearAllFacets = () => {
    setQuickFacets({});
  };

  // Preset Handlers
  const handleSavePreset = (name: string) => {
    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name,
      group: filterGroup,
      dateFilter,
      createdAt: new Date().toISOString(),
    };
    setPresets(prev => [...prev, newPreset]);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setFilterGroup(preset.group);
    if (preset.dateFilter) {
      setDateFilter(preset.dateFilter);
    }
  };

  const handleDeletePreset = (id: string) => {
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const handleAddChartToComposer = (cfg: ChartConfig) => {
    updateActiveComposer({ charts: [...activeComposer.charts, cfg] });
  };

  const handlePinToOverview = (cfg: ChartConfig) => {
    if (!dataset) return;
    setPinnedByDataset(prev => ({
      ...prev,
      [dataset.id]: [...(prev[dataset.id] || []), cfg],
    }));
  };

  const handleUnpinChart = (chartId: string) => {
    if (!dataset) return;
    setPinnedByDataset(prev => ({
      ...prev,
      [dataset.id]: (prev[dataset.id] || []).filter(c => c.id !== chartId),
    }));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="h-screen w-screen flex flex-col bg-[#0a0c10] text-[#e2e8f0] select-none overflow-hidden"
    >
      {/* Top Frameless Titlebar */}
      <TitleBar
        currentDataset={dataset}
        datasets={datasets}
        onSelectDataset={handleSelectDataset}
        onRenameDataset={handleRenameDataset}
        onOpenDatasetManager={() => setDatasetManagerOpen(true)}
        onOpenColumnSelection={() => handleOpenColumnSelection()}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onImportClick={handleImportClick}
        onLoadDesktopJira={handleLoadDesktopJira}
        loading={loading}
      />

      {/* Dedicated Date Filters Bar */}
      {dataset && (
        <DateFilterBar
          dataset={dataset}
          dateFilter={dateFilter}
          onChangeDateFilter={setDateFilter}
          onClearDateFilter={() => setDateFilter({
            ...dateFilter,
            startDate: '',
            endDate: '',
            workStartedFilter: 'all',
            dueFilter: 'all',
          })}
          onOpenFieldMapping={() => handleOpenColumnSelection(null, 'mapping')}
        />
      )}

      {/* Complex Query Builder Drawer */}
      {dataset && (
        <QueryBuilder
          columns={dataset.columns}
          filterGroup={filterGroup}
          onChangeFilterGroup={setFilterGroup}
          onClearFilters={() => setFilterGroup({ id: 'fg_root', logicalOperator: 'AND', rules: [] })}
          presets={presets}
          onSavePreset={handleSavePreset}
          onLoadPreset={handleLoadPreset}
          onDeletePreset={handleDeletePreset}
          isOpen={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
        />
      )}

      {/* Active Filter Breadcrumbs Bar */}
      {dataset && (
        <ActiveFilterBar
          dateFilter={dateFilter}
          quickFacets={quickFacets}
          filterGroup={filterGroup}
          columnMetaMap={columnMetaMap}
          onClearDateRange={() => setDateFilter(prev => ({ ...prev, startDate: '', endDate: '' }))}
          onClearWorkStarted={() => setDateFilter(prev => ({ ...prev, workStartedFilter: 'all' }))}
          onClearDueFilter={() => setDateFilter(prev => ({ ...prev, dueFilter: 'all' }))}
          onRemoveFacetValue={handleToggleFacetValue}
          onRemoveRule={(ruleId) =>
            setFilterGroup(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== ruleId) }))
          }
          onClearAll={handleClearAllFilters}
        />
      )}

      {/* Jira Key Controller / Dataset Operation Feedback Notification */}
      {upsertNotification && (
        <div className="bg-emerald-950/60 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-emerald-300 text-xs font-mono animate-in slide-in-from-top-1 no-print">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{upsertNotification}</span>
          </div>
          <button
            onClick={() => setUpsertNotification(null)}
            className="text-xs text-emerald-400 hover:text-white"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-950/50 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-rose-300 text-xs font-mono no-print">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-rose-400 hover:text-white"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          dataset={dataset}
          filterDrawerOpen={filterDrawerOpen}
          onToggleFilterDrawer={() => setFilterDrawerOpen(!filterDrawerOpen)}
          activeFilterCount={activeFilterCount}
          onExportClick={() => setExportModalOpen(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        />

        {/* Quick Facets Panel */}
        {dataset && activeView !== 'composer' && (
          <QuickFacets
            columns={dataset.columns}
            jiraFields={dataset.jiraFields}
            selectedFacets={quickFacets}
            onToggleFacetValue={handleToggleFacetValue}
            onClearFacetColumn={handleClearFacetColumn}
            onClearAllFacets={handleClearAllFacets}
            isCollapsed={facetsCollapsed}
            onToggleCollapse={() => setFacetsCollapsed(prev => !prev)}
          />
        )}

        {/* Active Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#0a0c10]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-slate-400">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
              <span>Veri kümesi telemetrisi ayrıştırılıyor ve indeksleniyor...</span>
            </div>
          ) : !dataset ? (
            /* Empty State / Welcome Dropzone */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 font-mono select-none">
              <div className="w-16 h-16 rounded-md bg-[#121620] border border-white/[0.1] flex items-center justify-center text-cyan-400 shadow-2xl">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Aktif Veri Kümesi Bulunmuyor
                </h2>
                <p className="text-xs text-slate-400 max-w-md">
                  Raporları ve grafikleri görüntülemek için herhangi bir CSV dosyasını içe aktarın veya Masaüstünüzdeki Jira (2).csv dosyasını yükleyin.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleImportClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono text-white rounded transition-colors"
                >
                  <UploadCloud className="w-4 h-4 text-cyan-400" />
                  <span>{t.importCsv}...</span>
                </button>

                <button
                  onClick={handleLoadDesktopJira}
                  className="flex items-center space-x-2 px-4 py-2 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-xs font-mono text-cyan-300 rounded transition-colors"
                >
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span>{t.loadDesktopJira}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Selected View Render */
            <>
              {activeView === 'overview' && (
                <OverviewView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  pinnedCharts={activePinnedCharts}
                  onUnpinChart={handleUnpinChart}
                  onNavigateToView={setActiveView}
                  onSelectRow={setSelectedRow}
                  onChartElementClick={handleToggleFacetValue}
                />
              )}

              {activeView === 'charts' && (
                <ChartStudioView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  onAddChartToComposer={handleAddChartToComposer}
                  onPinToOverview={handlePinToOverview}
                  onSelectRow={setSelectedRow}
                  onChartElementClick={handleToggleFacetValue}
                />
              )}

              {activeView === 'jira_analytics' && (
                <JiraAnalyticsView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  onSelectRow={setSelectedRow}
                  onChartElementClick={handleToggleFacetValue}
                />
              )}

              {activeView === 'audit_report' && (
                <AuditReportView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  onSelectRow={setSelectedRow}
                  onChartElementClick={handleToggleFacetValue}
                  onOpenColumnSelection={() => handleOpenColumnSelection(null, 'mapping')}
                />
              )}

              {activeView === 'completed_report' && (
                <CompletedReportView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  onSelectRow={setSelectedRow}
                  onChartElementClick={handleToggleFacetValue}
                  onOpenColumnSelection={() => handleOpenColumnSelection(null, 'mapping')}
                />
              )}

              {activeView === 'grid' && (
                <DataGridView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  onSelectRow={setSelectedRow}
                />
              )}

              {activeView === 'pivot' && (
                <PivotView
                  dataset={dataset}
                  filteredRows={filteredRows}
                />
              )}

              {activeView === 'composer' && (
                <ComposerView
                  dataset={dataset}
                  filteredRows={filteredRows}
                  columnMetaMap={columnMetaMap}
                  composerCharts={activeComposer.charts}
                  reportTitle={activeComposer.title}
                  reportNotes={activeComposer.notes}
                  onChangeReportTitle={(title) => updateActiveComposer({ title })}
                  onChangeReportNotes={(notes) => updateActiveComposer({ notes })}
                  onUpdateComposerCharts={(charts) => updateActiveComposer({ charts })}
                  onSelectRow={setSelectedRow}
                />
              )}

              {activeView === 'schema' && (
                <SchemaView
                  dataset={dataset}
                  onOpenColumnSelection={() => handleOpenColumnSelection()}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Bottom Technical Status Bar */}
      <StatusBar
        dataset={dataset}
        filteredCount={filteredRows.length}
        totalCount={dataset?.rows.length || 0}
        activeFilterCount={activeFilterCount}
      />

      {/* Row Detail Drawer Modal */}
      {selectedRow && dataset && (
        <RowDetailModal
          row={selectedRow}
          dataset={dataset}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* Export Modal */}
      {dataset && (
        <ExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          dataset={dataset}
          filteredRows={filteredRows}
        />
      )}

      {/* Column Selection & Main Field Mapping Modal (for Import & Loaded Datasets) */}
      <ColumnSelectionModal
        isOpen={columnModalOpen}
        onClose={() => {
          setColumnModalOpen(false);
          setColumnModalDataset(null);
        }}
        dataset={columnModalDataset}
        mode={columnModalMode}
        initialTab={columnModalInitialTab}
        onConfirm={handleConfirmColumnSelection}
      />

      {/* Jira Key Controller Upsert / New Dataset Conflict Modal */}
      {dataset && stagedIncomingDataset && (
        <ImportOptionsModal
          isOpen={importOptionsOpen}
          onClose={() => {
            setImportOptionsOpen(false);
            setStagedIncomingDataset(null);
          }}
          activeDataset={dataset}
          incomingDataset={stagedIncomingDataset}
          onConfirmAddNew={handleConfirmAddNew}
          onConfirmMerge={handleConfirmMerge}
          onConfirmReplace={handleConfirmReplace}
          onEditColumns={() => {
            setImportOptionsOpen(false);
            setColumnModalDataset(stagedIncomingDataset);
            setColumnModalMode('import');
            setColumnModalInitialTab('columns');
            setColumnModalOpen(true);
          }}
        />
      )}

      {/* Saved Datasets Manager Modal */}
      <DatasetManagerModal
        isOpen={datasetManagerOpen}
        onClose={() => setDatasetManagerOpen(false)}
        datasets={datasets}
        activeDatasetId={dataset?.id || null}
        filteredCount={filteredRows.length}
        onSelectDataset={handleSelectDataset}
        onRenameDataset={handleRenameDataset}
        onDeleteDataset={handleDeleteDataset}
        onEditDatasetColumns={(ds) => handleOpenColumnSelection(ds)}
        onSaveFilteredAsNewDataset={handleSaveFilteredAsNewDataset}
        onImportNewCsv={handleImportClick}
      />

      {/* Global Ctrl+K Command Palette */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        dataset={dataset}
        datasets={datasets}
        onNavigateView={setActiveView}
        onSelectDataset={handleSelectDataset}
        onSelectRow={setSelectedRow}
        onToggleTheme={toggleTheme}
        onImportCsv={handleImportClick}
        onOpenExport={() => setExportModalOpen(true)}
        onOpenColumnSelection={() => handleOpenColumnSelection()}
        onClearAllFilters={handleClearAllFilters}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <MainApplication />
      </LanguageProvider>
    </ThemeProvider>
  );
};

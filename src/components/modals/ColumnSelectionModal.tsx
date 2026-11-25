import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Columns,
  Search,
  Check,
  CheckSquare,
  Square,
  Sparkles,
  FileSpreadsheet,
  Calendar,
  AlertCircle,
  SlidersHorizontal,
  Wand2,
  Eraser,
} from 'lucide-react';
import { ColumnMeta, ColumnType, Dataset } from '../../types';
import {
  detectJiraFields,
  getDefaultSelectedColumnKeys,
  getSelectableColumns,
} from '../../core/parser';
import { SearchableSelect, SearchableOption } from '../common/SearchableSelect';

type JiraMappingKey = keyof NonNullable<Dataset['jiraFields']>;

interface ColumnSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset | null;
  mode: 'import' | 'edit';
  initialTab?: 'columns' | 'mapping';
  onConfirm: (
    selectedKeys: string[],
    customName?: string,
    fieldMapping?: Dataset['jiraFields']
  ) => void;
}

type StatusFilter = 'all' | 'selected' | 'unselected' | 'non_empty';

interface MappingFieldGroup {
  groupTitle: string;
  description: string;
  fields: {
    key: JiraMappingKey;
    label: string;
    hint: string;
    preferDate?: boolean;
  }[];
}

const MAPPING_GROUPS: MappingFieldGroup[] = [
  {
    groupTitle: 'Tarih & Süre Ana Filtre Grupları',
    description: 'Üst tarih çubuğu, çözüm süresi ve tarih eksiklik denetiminde kullanılır. Veri setinizde olmayanları boş bırakabilirsiniz.',
    fields: [
      {
        key: 'startDateCol',
        label: 'Başlangıç Tarihi',
        hint: 'Ana tarih aralığı filtresi ve denetim başlangıcı',
        preferDate: true,
      },
      {
        key: 'dueCol',
        label: 'Bitiş Tarihi',
        hint: 'Bitiş tarihi hızlı filtresi ve hedef termin',
        preferDate: true,
      },
      {
        key: 'workStartDateCol',
        label: 'Yapıma Başlama Tarihi',
        hint: 'Opsiyonel: Veri setinizde yoksa boş bırakabilirsiniz',
        preferDate: true,
      },
      {
        key: 'createdCol',
        label: 'Oluşturulma Tarihi',
        hint: 'Başlangıç tarihi yoksa yedek zaman ekseni',
        preferDate: true,
      },
      {
        key: 'resolvedCol',
        label: 'Çözülme / Kapanış Tarihi',
        hint: 'Bitiş tarihi yoksa çözüm süresi hesabında kullanılır',
        preferDate: true,
      },
      {
        key: 'updatedCol',
        label: 'Son Güncelleme Tarihi',
        hint: 'Güncellenme zamanı ve Tamamlananlar rapor kolonu',
        preferDate: true,
      },
    ],
  },
  {
    groupTitle: 'İş Akışı & Hızlı Filtre Grupları',
    description: 'Genel Bakış KPI kartları, Durum Çubuğu, Hızlı Filtreler ve analitik kırılımlar.',
    fields: [
      {
        key: 'statusCol',
        label: 'Durum (Status)',
        hint: 'Tamamlanma oranı, Durum Çubuğu ve durum filtreleri',
      },
      {
        key: 'priorityCol',
        label: 'Öncelik (Priority)',
        hint: 'Yüksek öncelik odağı ve önem dağılımı',
      },
      {
        key: 'typeCol',
        label: 'Konu Türü / Görev Tipi',
        hint: 'Alt görev ayrımı ve tür kırılımı',
      },
      {
        key: 'assigneeCol',
        label: 'Yazılımcı / Atanan Kişi',
        hint: 'Kişi bazlı iş yükü ve hızlı filtre',
      },
      {
        key: 'departmentCol',
        label: 'Departman / Ekip',
        hint: 'Departman dağılımı ve hızlı filtre',
      },
      {
        key: 'requesterCol',
        label: 'Talep Sahibi',
        hint: 'Özet tabloda talep eden kişi kolonu',
      },
      {
        key: 'lastActorCol',
        label: 'Son İşlem Yapan (E-posta)',
        hint: 'Varsa son güncelleyen kullanıcı e-posta/bilgi kolonu (yoksa boş bırakılabilir)',
      },
      {
        key: 'environmentCol',
        label: 'Ortam (Environment)',
        hint: 'Prod / Test ortam rozetleri ve filtresi',
      },
      {
        key: 'labelsCol',
        label: 'Etiketler (Labels)',
        hint: 'Etiket grafiği ve BUG / FEATURE analizleri',
      },
    ],
  },
  {
    groupTitle: 'Kayıt Kimliği & Özet Tablo',
    description: 'Arama paleti, alt görev eşleşmesi ve ham veri tablosu başlıkları.',
    fields: [
      {
        key: 'keyCol',
        label: 'Kayıt Anahtarı (Key / ID)',
        hint: 'Benzersiz görev kodu (Örn: DUP-383) ve birleştirme anahtarı',
      },
      {
        key: 'summaryCol',
        label: 'Başlık / Özet',
        hint: 'Görev başlığı ve detay penceresi başlığı',
      },
    ],
  },
];

export const ColumnSelectionModal: React.FC<ColumnSelectionModalProps> = ({
  isOpen,
  onClose,
  dataset,
  mode,
  initialTab = 'columns',
  onConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<'columns' | 'mapping'>(initialTab);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [fieldMapping, setFieldMapping] = useState<NonNullable<Dataset['jiraFields']>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ColumnType>('all');
  const [customName, setCustomName] = useState('');

  const selectableColumns = useMemo<ColumnMeta[]>(() => {
    if (!dataset) return [];
    return getSelectableColumns(dataset);
  }, [dataset]);

  useEffect(() => {
    if (!isOpen || !dataset) return;
    const initialKeys =
      dataset.selectedColumnKeys && dataset.selectedColumnKeys.length > 0
        ? dataset.selectedColumnKeys
        : getDefaultSelectedColumnKeys(dataset.allColumns || dataset.columns);
    setSelectedSet(new Set(initialKeys));
    setFieldMapping({ ...(dataset.rawJiraFields || dataset.jiraFields || {}) });
    setCustomName(dataset.name);
    setActiveTab(initialTab);
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
  }, [isOpen, dataset, initialTab]);

  const jiraRoleByKey = useMemo(() => {
    const map = new Map<string, string>();
    const roleLabels: Partial<Record<JiraMappingKey, string>> = {
      keyCol: 'Key',
      summaryCol: 'Başlık',
      statusCol: 'Durum',
      typeCol: 'Tür',
      priorityCol: 'Öncelik',
      assigneeCol: 'Yazılımcı',
      departmentCol: 'Departman',
      requesterCol: 'Talep Sahibi',
      lastActorCol: 'Son İşlem Yapan',
      startDateCol: 'Başlangıç',
      workStartDateCol: 'Yapım Baş.',
      dueCol: 'Bitiş',
      createdCol: 'Oluşturulan',
      resolvedCol: 'Çözülme',
      updatedCol: 'Güncelleme',
      labelsCol: 'Etiketler',
      environmentCol: 'Ortam',
      moduleCol: 'Modül',
    };
    (Object.keys(roleLabels) as JiraMappingKey[]).forEach(fieldKey => {
      const colKey = fieldMapping[fieldKey];
      if (colKey) {
        const existing = map.get(colKey);
        const label = roleLabels[fieldKey]!;
        map.set(colKey, existing ? `${existing}, ${label}` : label);
      }
    });
    return map;
  }, [fieldMapping]);

  const hasAnyMapping = useMemo(
    () => Object.values(fieldMapping).some(v => Boolean(v && String(v).trim())),
    [fieldMapping]
  );

  const assignedMappingCount = useMemo(
    () =>
      MAPPING_GROUPS.reduce(
        (acc, grp) => acc + grp.fields.filter(f => Boolean(fieldMapping[f.key])).length,
        0
      ),
    [fieldMapping]
  );

  const totalMappingSlots = useMemo(
    () => MAPPING_GROUPS.reduce((acc, grp) => acc + grp.fields.length, 0),
    []
  );

  const nonEmptyColumnsCount = useMemo(
    () => selectableColumns.filter(c => c.totalCount - c.missingCount > 0).length,
    [selectableColumns]
  );

  const filteredColumns = useMemo(() => {
    const q = search.toLocaleLowerCase('tr-TR').trim();
    return selectableColumns.filter(col => {
      if (statusFilter === 'selected' && !selectedSet.has(col.key)) return false;
      if (statusFilter === 'unselected' && selectedSet.has(col.key)) return false;
      if (statusFilter === 'non_empty' && col.totalCount - col.missingCount === 0) return false;
      if (typeFilter !== 'all' && col.type !== typeFilter) return false;

      if (q) {
        const matchLabel = col.label.toLocaleLowerCase('tr-TR').includes(q);
        const matchKey = col.key.toLocaleLowerCase('tr-TR').includes(q);
        const matchType = col.type.toLocaleLowerCase('tr-TR').includes(q);
        const role = (jiraRoleByKey.get(col.key) || '').toLocaleLowerCase('tr-TR');
        if (!matchLabel && !matchKey && !matchType && !role.includes(q)) return false;
      }
      return true;
    });
  }, [selectableColumns, search, statusFilter, typeFilter, selectedSet, jiraRoleByKey]);

  const mappingOptionsForField = (preferDate?: boolean): SearchableOption[] => {
    const sorted = [...selectableColumns].sort((a, b) => {
      const aSelected = selectedSet.has(a.key) ? 0 : 1;
      const bSelected = selectedSet.has(b.key) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      if (preferDate) {
        const aDate = a.type === 'date' || a.isDateColumn ? 0 : 1;
        const bDate = b.type === 'date' || b.isDateColumn ? 0 : 1;
        if (aDate !== bDate) return aDate - bDate;
      }
      return a.label.localeCompare(b.label, 'tr-TR');
    });

    return [
      {
        value: '',
        label: '— Atanmamış (Boş Bırak) —',
        subLabel: 'Bu filtre/alan kullanılmayacak',
      },
      ...sorted.map(col => ({
        value: col.key,
        label: col.label,
        subLabel: `${col.type}${!selectedSet.has(col.key) ? ' · Pasif (seçilirse aktif olur)' : ''}`,
      })),
    ];
  };

  if (!isOpen || !dataset) return null;

  const toggleColumn = (key: string) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAssignField = (fieldKey: JiraMappingKey, colKey: string) => {
    setFieldMapping(prev => {
      const next = { ...prev };
      if (!colKey) {
        delete next[fieldKey];
      } else {
        next[fieldKey] = colKey;
      }
      return next;
    });

    // Ensure assigned column is checked in selectedSet
    if (colKey) {
      setSelectedSet(prev => {
        if (prev.has(colKey)) return prev;
        const next = new Set(prev);
        next.add(colKey);
        return next;
      });
    }
  };

  const handleAutoDetectMapping = () => {
    const detected = detectJiraFields(selectableColumns.map(c => c.key));
    setFieldMapping(detected);
    // Activate any newly auto-detected columns so they take effect immediately
    setSelectedSet(prev => {
      const next = new Set(prev);
      Object.values(detected).forEach(k => {
        if (k) next.add(k);
      });
      return next;
    });
  };

  const handleClearAllMapping = () => {
    setFieldMapping({});
  };

  const selectAllFiltered = () => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      filteredColumns.forEach(c => next.add(c.key));
      return next;
    });
  };

  const selectAllColumns = () => {
    setSelectedSet(new Set(selectableColumns.map(c => c.key)));
  };

  const selectNonEmptyOnly = () => {
    setSelectedSet(
      new Set(
        selectableColumns
          .filter(c => c.totalCount - c.missingCount > 0)
          .map(c => c.key)
      )
    );
  };

  const selectJiraCore = () => {
    const detected = detectJiraFields(selectableColumns.map(c => c.key));
    const coreKeys = new Set<string>();
    Object.values(fieldMapping).forEach(k => {
      if (k) coreKeys.add(k);
    });
    Object.values(detected).forEach(k => {
      if (k) coreKeys.add(k);
    });
    selectableColumns.forEach(c => {
      const lk = c.key.toLowerCase();
      if (
        lk === 'açıklama' ||
        lk === 'description' ||
        lk === 'üst anahtar' ||
        lk === 'parent key' ||
        lk === 'parent summary' ||
        lk.startsWith('_merged_etiketler') ||
        lk.startsWith('_merged_özel alan (ortam)')
      ) {
        coreKeys.add(c.key);
      }
    });
    const valid = selectableColumns.filter(c => coreKeys.has(c.key)).map(c => c.key);
    if (valid.length > 0) {
      setSelectedSet(new Set(valid));
    }
  };

  const clearSelection = () => {
    setSelectedSet(new Set());
  };

  const handleConfirm = () => {
    if (selectedSet.size === 0) return;
    const orderedKeys = selectableColumns
      .filter(c => selectedSet.has(c.key))
      .map(c => c.key);
    onConfirm(
      orderedKeys,
      mode === 'import' ? customName.trim() || dataset.name : undefined,
      fieldMapping
    );
  };

  const selectedCount = selectableColumns.filter(c => selectedSet.has(c.key)).length;
  const formattedDate = new Date(dataset.importedAt).toLocaleString('tr-TR');

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 select-none no-print">
      <div className="bg-[#0f1219] border border-white/[0.12] rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0b0e14]">
          <div className="flex items-center space-x-2.5">
            <Columns className="w-4 h-4 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-white font-mono">
                {mode === 'import'
                  ? 'Veri Seti Yükleme — Kolon ve Ana Filtre Yapılandırması'
                  : 'Veri Seti Kolon ve Ana Filtre Yapılandırması'}
              </h2>
              <p className="text-2xs text-slate-400 font-mono mt-0.5">
                Kullanılacak kolonları seçebilir; Başlangıç, Bitiş, Durum gibi ana filtre gruplarını atayabilir veya boş bırakabilirsiniz.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Metadata & Tabs Bar */}
        <div className="px-4 py-3 bg-[#0c0f16] border-b border-white/[0.06] font-mono space-y-2.5">
          {mode === 'import' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="text-2xs uppercase tracking-wider text-cyan-400 font-semibold block mb-1">
                  Veri Seti İsmi
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Veri seti ismi..."
                  className="w-full bg-[#141822] border border-white/[0.12] focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="md:col-span-7 flex flex-wrap items-center justify-between gap-2 bg-[#141822] border border-white/[0.06] rounded px-3 py-2 text-2xs text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-200 font-semibold truncate max-w-[200px]" title={dataset.sourceFile}>
                    {dataset.sourceFile}
                  </span>
                  <span>({dataset.rows.length.toLocaleString()} kayıt)</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{formattedDate}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="text-white font-semibold text-xs">{dataset.name}</span>
                <span className="text-slate-500">|</span>
                <span>{dataset.sourceFile}</span>
                <span className="text-slate-500">|</span>
                <span>{dataset.rows.length.toLocaleString()} kayıt</span>
              </div>
              <div className="text-cyan-400 font-semibold">
                {selectedCount} / {selectableColumns.length} kolon · {assignedMappingCount} ana alan atanmış
              </div>
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab('columns')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors border ${
                activeTab === 'columns'
                  ? 'bg-cyan-500/15 border-cyan-500/45 text-cyan-300 font-semibold'
                  : 'bg-[#141822] border-white/[0.08] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>1. Kullanılacak Kolonlar ({selectedCount}/{selectableColumns.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mapping')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs transition-colors border ${
                activeTab === 'mapping'
                  ? 'bg-cyan-500/15 border-cyan-500/45 text-cyan-300 font-semibold'
                  : 'bg-[#141822] border-white/[0.08] text-slate-400 hover:text-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>2. Ana Filtre & Alan Grupları ({assignedMappingCount}/{totalMappingSlots})</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Columns Checklist */}
        {activeTab === 'columns' && (
          <>
            <div className="px-4 py-2.5 bg-[#0b0e14] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 font-mono">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Kolon adı, anahtar veya tip ara..."
                    className="w-full bg-[#141822] border border-white/[0.1] focus:border-cyan-500 rounded pl-8 pr-3 py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as 'all' | ColumnType)}
                  className="bg-[#141822] border border-white/[0.1] rounded px-2 py-1 text-2xs text-slate-300 focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">Tüm Tipler</option>
                  <option value="string">Metin (string)</option>
                  <option value="date">Tarih (date)</option>
                  <option value="number">Sayı (number)</option>
                  <option value="category">Kategori (category)</option>
                  <option value="array">Dizi (array)</option>
                </select>

                <div className="flex items-center bg-[#141822] border border-white/[0.08] rounded p-0.5 text-2xs">
                  {(
                    [
                      { id: 'all', label: `Tümü (${selectableColumns.length})` },
                      { id: 'selected', label: `Seçili (${selectedCount})` },
                      { id: 'non_empty', label: `Dolu (${nonEmptyColumnsCount})` },
                      { id: 'unselected', label: `Pasif (${selectableColumns.length - selectedCount})` },
                    ] as const
                  ).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        statusFilter === tab.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap items-center gap-1.5 text-2xs">
                <button
                  type="button"
                  onClick={selectAllColumns}
                  className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 flex items-center space-x-1"
                >
                  <CheckSquare className="w-3 h-3 text-cyan-400" />
                  <span>Tümünü Seç</span>
                </button>
                {search || typeFilter !== 'all' || statusFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300"
                  >
                    Filtrelenenleri Seç ({filteredColumns.length})
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={selectNonEmptyOnly}
                  className="px-2 py-1 rounded bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/30 text-emerald-300"
                >
                  Sadece Dolu Olanlar
                </button>
                {hasAnyMapping && (
                  <button
                    type="button"
                    onClick={selectJiraCore}
                    className="px-2 py-1 rounded bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Atanan Ana Kolonlar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearSelection}
                  className="px-2 py-1 rounded bg-rose-950/20 hover:bg-rose-900/30 border border-rose-500/25 text-rose-300 flex items-center space-x-1"
                >
                  <Square className="w-3 h-3" />
                  <span>Temizle</span>
                </button>
              </div>
            </div>

            {/* Column List */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full border-collapse text-left text-xs font-mono">
                <thead className="sticky top-0 bg-[#0b0e14] border-b border-white/[0.08] z-10">
                  <tr>
                    <th className="px-4 py-2 text-2xs uppercase text-slate-400 w-10">Seç</th>
                    <th className="px-3 py-2 text-2xs uppercase text-slate-400">Kolon Adı</th>
                    <th className="px-3 py-2 text-2xs uppercase text-slate-400 w-24">Tip</th>
                    <th className="px-3 py-2 text-2xs uppercase text-slate-400 w-32 text-right">Doluluk</th>
                    <th className="px-3 py-2 text-2xs uppercase text-slate-400 w-20 text-right">Tekil</th>
                    <th className="px-4 py-2 text-2xs uppercase text-slate-400">Örnek Değerler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredColumns.map(col => {
                    const isChecked = selectedSet.has(col.key);
                    const nonEmpty = col.totalCount - col.missingCount;
                    const fillPct = col.totalCount > 0 ? Math.round((nonEmpty / col.totalCount) * 100) : 0;
                    const jiraRole = jiraRoleByKey.get(col.key);

                    return (
                      <tr
                        key={col.key}
                        onClick={() => toggleColumn(col.key)}
                        className={`cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-cyan-950/15 hover:bg-cyan-950/25'
                            : 'hover:bg-white/[0.02] opacity-70'
                        }`}
                      >
                        <td className="px-4 py-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                                : 'border-white/25 bg-[#141822]'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                              {col.label}
                            </span>
                            {jiraRole && (
                              <span className="px-1.5 py-0.2 rounded text-2xs bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                {jiraRole}
                              </span>
                            )}
                          </div>
                          {col.key !== col.label && (
                            <div className="text-2xs text-slate-500">{col.key}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-2xs uppercase font-semibold border ${
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
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="w-14 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  fillPct >= 75
                                    ? 'bg-emerald-500'
                                    : fillPct > 0
                                    ? 'bg-amber-500'
                                    : 'bg-slate-600'
                                }`}
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                            <span className="text-2xs text-slate-300 w-9 text-right">%{fillPct}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-400 text-2xs">
                          {col.uniqueCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-2xs text-slate-400 max-w-xs truncate">
                          {col.topValues.length > 0
                            ? col.topValues.slice(0, 3).map(tv => tv.value).join(', ')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredColumns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                        Arama kriterine uyan kolon bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 2: Main Filter & Semantic Field Group Assignment */}
        {activeTab === 'mapping' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono">
            <div className="bg-[#121620] border border-white/[0.08] rounded p-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-2xs text-slate-300 leading-relaxed max-w-2xl">
                Sistem dosya başlıklarından <strong className="text-cyan-300">Başlangıç</strong>,{' '}
                <strong className="text-cyan-300">Bitiş</strong> ve <strong className="text-cyan-300">Durum</strong> gibi ana filtre gruplarını otomatik atar.
                Veri setinizde bulunmayan alanları (ör. <span className="text-amber-300">Yapıma Başlama Tarihi</span>) boş bırakabilir veya farklı kolon adlarıyla eşleştirebilirsiniz.
              </p>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAutoDetectMapping}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/35 text-2xs text-cyan-300 transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Otomatik Algıla</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAllMapping}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-white/[0.04] hover:bg-rose-950/30 border border-white/[0.1] hover:border-rose-500/30 text-2xs text-slate-300 hover:text-rose-300 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Tümünü Boş Bırak</span>
                </button>
              </div>
            </div>

            {MAPPING_GROUPS.map(group => (
              <div
                key={group.groupTitle}
                className="bg-[#0c0f16] border border-white/[0.08] rounded-md p-4 space-y-3"
              >
                <div className="border-b border-white/[0.06] pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    {group.groupTitle}
                  </h3>
                  <p className="text-2xs text-slate-400 mt-0.5">{group.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.fields.map(field => {
                    const currentVal = fieldMapping[field.key] || '';
                    const isAssigned = Boolean(currentVal);
                    const options = mappingOptionsForField(field.preferDate);

                    return (
                      <div
                        key={field.key}
                        className={`p-2.5 rounded border transition-colors ${
                          isAssigned
                            ? 'bg-[#141822] border-cyan-500/30'
                            : 'bg-[#10141d] border-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">
                            {field.label}
                          </span>
                          {isAssigned ? (
                            <button
                              type="button"
                              onClick={() => handleAssignField(field.key, '')}
                              className="text-2xs text-slate-400 hover:text-rose-300 px-1.5 py-0.2 rounded bg-white/[0.04]"
                              title="Atamayı kaldır / boş bırak"
                            >
                              Boş Bırak
                            </button>
                          ) : (
                            <span className="text-2xs text-slate-500 italic">Atanmamış (Boş)</span>
                          )}
                        </div>

                        <SearchableSelect
                          value={currentVal}
                          onChange={(val) => handleAssignField(field.key, val)}
                          options={options}
                          placeholder="— Atanmamış (Boş Bırak) —"
                          searchPlaceholder="Kolon ara..."
                          className="w-full"
                          dropdownWidthClass="min-w-[300px]"
                          triggerClassName={`w-full border rounded px-2.5 py-1.5 text-xs font-mono ${
                            isAssigned
                              ? 'bg-[#0a0c10] border-cyan-500/40 text-cyan-200'
                              : 'bg-[#0a0c10] border-white/[0.1] text-slate-400'
                          }`}
                        />

                        <div className="text-2xs text-slate-500 mt-1">{field.hint}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#0b0e14] flex flex-wrap items-center justify-between gap-3 font-mono">
          <div className="flex items-center space-x-2 text-2xs">
            {selectedCount === 0 ? (
              <span className="flex items-center space-x-1.5 text-rose-400 font-semibold">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Devam etmek için en az 1 kolon işaretlemelisiniz.</span>
              </span>
            ) : (
              <span className="text-slate-300">
                <strong className="text-cyan-400">{selectedCount}</strong> / {selectableColumns.length} kolon ·{' '}
                <strong className="text-emerald-400">{assignedMappingCount}</strong> ana alan atanmış
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded border border-white/[0.08] bg-white/[0.02]"
            >
              İptal
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition-colors"
            >
              {mode === 'import' ? 'Seçili Yapılandırmayla Devam Et' : 'Değişiklikleri Uygula ve Kaydet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

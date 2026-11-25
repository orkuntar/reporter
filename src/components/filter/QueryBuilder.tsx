import React, { useState } from 'react';
import { Plus, Trash2, Bookmark, X, Filter, RotateCcw } from 'lucide-react';
import { ColumnMeta, FilterGroup, FilterOperator, FilterPreset, FilterRule } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { SearchableSelect } from '../common/SearchableSelect';

interface QueryBuilderProps {
  columns: ColumnMeta[];
  filterGroup: FilterGroup;
  onChangeFilterGroup: (group: FilterGroup) => void;
  onClearFilters: () => void;
  presets: FilterPreset[];
  onSavePreset: (name: string) => void;
  onLoadPreset: (preset: FilterPreset) => void;
  onDeletePreset: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const STRING_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: 'içerir' },
  { value: 'not_contains', label: 'içermez' },
  { value: 'equals', label: 'eşittir' },
  { value: 'not_equals', label: 'eşit değildir' },
  { value: 'starts_with', label: 'ile başlar' },
  { value: 'ends_with', label: 'ile biter' },
  { value: 'is_empty', label: 'boştur' },
  { value: 'is_not_empty', label: 'dolu / boş değildir' },
  { value: 'in', label: 'içindedir (virgülle ayırın)' },
];

const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'between', label: 'arasında' },
  { value: 'is_empty', label: 'boştur' },
  { value: 'is_not_empty', label: 'dolu' },
];

const DATE_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'date_after', label: 'tarihinden sonra' },
  { value: 'date_before', label: 'tarihinden önce' },
  { value: 'date_between', label: 'tarihleri arasında' },
  { value: 'date_in_last_days', label: 'son N gün içinde' },
  { value: 'is_empty', label: 'tarih boş' },
  { value: 'is_not_empty', label: 'tarih dolu' },
];

export const QueryBuilder: React.FC<QueryBuilderProps> = ({
  columns,
  filterGroup,
  onChangeFilterGroup,
  onClearFilters,
  presets,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
  isOpen,
  onClose,
}) => {
  const { t } = useLanguage();
  const [presetNameInput, setPresetNameInput] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  if (!isOpen) return null;

  const columnMap = new Map(columns.map(c => [c.key, c]));

  const handleAddRule = () => {
    const defaultCol = columns[0]?.key || '';
    const newRule: FilterRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      column: defaultCol,
      operator: 'contains',
      value: '',
    };
    onChangeFilterGroup({
      ...filterGroup,
      rules: [...filterGroup.rules, newRule],
    });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<FilterRule>) => {
    const updatedRules = filterGroup.rules.map(r => {
      if (r.id !== ruleId) return r;
      const merged = { ...r, ...updates };

      if (updates.column && updates.column !== r.column) {
        const colMeta = columnMap.get(updates.column);
        if (colMeta?.type === 'number') merged.operator = 'gte';
        else if (colMeta?.type === 'date') merged.operator = 'date_after';
        else merged.operator = 'contains';
        merged.value = '';
        merged.value2 = undefined;
      }
      return merged;
    });

    onChangeFilterGroup({
      ...filterGroup,
      rules: updatedRules,
    });
  };

  const handleRemoveRule = (ruleId: string) => {
    onChangeFilterGroup({
      ...filterGroup,
      rules: filterGroup.rules.filter(r => r.id !== ruleId),
    });
  };

  const handleToggleLogic = () => {
    onChangeFilterGroup({
      ...filterGroup,
      logicalOperator: filterGroup.logicalOperator === 'AND' ? 'OR' : 'AND',
    });
  };

  const handleSavePresetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (presetNameInput.trim()) {
      onSavePreset(presetNameInput.trim());
      setPresetNameInput('');
      setIsSavingPreset(false);
    }
  };

  return (
    <div className="bg-[#0b0e14] border-b border-white/[0.08] px-4 py-3.5 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-2xl select-none no-print">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono font-semibold tracking-wider uppercase text-cyan-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Gelişmiş Filtre Sorgulayıcı</span>
          </div>

          <div className="flex items-center space-x-1 text-2xs font-mono">
            <span className="text-slate-400">KOŞUL:</span>
            <button
              onClick={handleToggleLogic}
              className={`px-2 py-0.5 rounded text-2xs font-mono font-bold tracking-wider transition-colors ${
                filterGroup.logicalOperator === 'AND'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              }`}
            >
              {filterGroup.logicalOperator === 'AND' ? 'TÜM KOŞULLAR (VE / AND)' : 'HERHANGİ BİRİ (VEYA / OR)'}
            </button>
          </div>
        </div>

        {/* Presets & Actions */}
        <div className="flex items-center space-x-2">
          {presets.length > 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-2xs font-mono text-slate-400">ŞABLON:</span>
              <SearchableSelect
                value=""
                onChange={(val) => {
                  const p = presets.find(item => item.id === val);
                  if (p) onLoadPreset(p);
                }}
                options={presets.map(p => ({
                  value: p.id,
                  label: p.name,
                  subLabel: `${p.group.rules.length} kural`
                }))}
                placeholder="Kayıtlı Filtre Yükle..."
                searchPlaceholder="Şablon ara..."
                className="w-52"
                triggerClassName="w-full bg-[#141822] border border-white/[0.1] hover:border-white/20 text-xs text-slate-300 rounded px-2 py-1 font-mono"
              />
            </div>
          )}

          {!isSavingPreset ? (
            <button
              onClick={() => setIsSavingPreset(true)}
              className="flex items-center space-x-1 px-2 py-1 text-2xs font-mono text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors"
            >
              <Bookmark className="w-3 h-3 text-cyan-400" />
              <span>Filtreyi Kaydet</span>
            </button>
          ) : (
            <form onSubmit={handleSavePresetSubmit} className="flex items-center space-x-1">
              <input
                type="text"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                placeholder="Filtre Adı"
                className="bg-[#141822] border border-cyan-500/50 text-xs text-slate-200 px-2 py-0.5 rounded font-mono focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-black text-2xs font-mono rounded font-semibold"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setIsSavingPreset(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            </form>
          )}

          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 px-2 py-1 text-2xs font-mono text-slate-400 hover:text-rose-400 bg-white/[0.02] hover:bg-rose-500/10 border border-white/[0.06] rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t.reset}</span>
          </button>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {filterGroup.rules.map((rule, idx) => {
          const colMeta = columnMap.get(rule.column);
          const colType = colMeta?.type || 'string';

          let operators = STRING_OPERATORS;
          if (colType === 'number') operators = NUMBER_OPERATORS;
          else if (colType === 'date') operators = DATE_OPERATORS;

          const needsValue = !['is_empty', 'is_not_empty'].includes(rule.operator);
          const needsValue2 = ['between', 'date_between'].includes(rule.operator);

          return (
            <div
              key={rule.id}
              className="flex items-center space-x-2 bg-[#121620] border border-white/[0.06] rounded px-3 py-1.5"
            >
              <span className="text-2xs font-mono text-slate-400 w-5">
                #{idx + 1}
              </span>

              {/* Column Select (Searchable) */}
              <SearchableSelect
                value={rule.column}
                onChange={(val) => handleUpdateRule(rule.id, { column: val })}
                options={columns.map(c => ({
                  value: c.key,
                  label: c.label,
                  subLabel: c.type
                }))}
                placeholder="Kolon seç..."
                searchPlaceholder="Kolon ara..."
                className="w-56 flex-shrink-0"
                dropdownWidthClass="min-w-[280px]"
                triggerClassName="w-full bg-[#181d2a] border border-white/[0.1] hover:border-white/20 text-xs text-slate-200 rounded px-2.5 py-1 font-mono"
              />

              {/* Operator Select (Searchable) */}
              <SearchableSelect
                value={rule.operator}
                onChange={(val) => handleUpdateRule(rule.id, { operator: val as FilterOperator })}
                options={operators.map(op => ({
                  value: op.value,
                  label: op.label
                }))}
                placeholder="Koşul..."
                searchPlaceholder="Operatör ara..."
                className="w-48 flex-shrink-0"
                triggerClassName="w-full bg-[#181d2a] border border-white/[0.1] hover:border-white/20 text-xs text-cyan-300 rounded px-2 py-1 font-mono"
              />

              {/* Primary Value Input */}
              {needsValue && (
                <div className="flex-1 flex items-center space-x-1">
                  {colMeta?.type === 'category' && colMeta.topValues.length > 0 && !['contains', 'not_contains'].includes(rule.operator) ? (
                    <SearchableSelect
                      value={rule.value || ''}
                      onChange={(val) => handleUpdateRule(rule.id, { value: val })}
                      options={colMeta.topValues.map(tv => ({
                        value: tv.value,
                        label: tv.value,
                        subLabel: String(tv.count)
                      }))}
                      placeholder="Kategori seçiniz..."
                      searchPlaceholder="Değer ara..."
                      className="w-full"
                      triggerClassName="w-full bg-[#181d2a] border border-white/[0.1] hover:border-white/20 text-xs text-slate-200 rounded px-2.5 py-1 font-mono"
                    />
                  ) : colType === 'date' && rule.operator !== 'date_in_last_days' ? (
                    <input
                      type="date"
                      value={rule.value || ''}
                      onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                      className="bg-[#181d2a] border border-white/[0.1] text-xs text-slate-200 rounded px-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  ) : (
                    <input
                      type={colType === 'number' || rule.operator === 'date_in_last_days' ? 'number' : 'text'}
                      value={rule.value || ''}
                      placeholder={
                        rule.operator === 'date_in_last_days'
                          ? 'Örn: 30'
                          : rule.operator === 'in'
                          ? 'değer1, değer2'
                          : 'Değer...'
                      }
                      onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                      className="w-full bg-[#181d2a] border border-white/[0.1] text-xs text-slate-200 rounded px-2.5 py-1 font-mono focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                    />
                  )}
                </div>
              )}

              {/* Secondary Value Input for 'between' */}
              {needsValue2 && (
                <div className="flex items-center space-x-1">
                  <span className="text-2xs font-mono text-slate-500">VE</span>
                  <input
                    type={colType === 'date' ? 'date' : 'number'}
                    value={rule.value2 || ''}
                    placeholder="Bitiş değeri..."
                    onChange={(e) => handleUpdateRule(rule.id, { value2: e.target.value })}
                    className="bg-[#181d2a] border border-white/[0.1] text-xs text-slate-200 rounded px-2 py-1 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Delete Rule */}
              <button
                onClick={() => handleRemoveRule(rule.id)}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                title="Kuralı Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {filterGroup.rules.length === 0 && (
          <div className="text-center py-4 text-xs font-mono text-slate-500 border border-dashed border-white/[0.08] rounded">
            Herhangi bir filtre kuralı tanımlanmadı. Tüm kayıtlar dahil ediliyor.
          </div>
        )}
      </div>

      {/* Add Rule Button */}
      <div className="pt-1">
        <button
          onClick={handleAddRule}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-2xs font-mono uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-900/30 border border-cyan-500/30 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Filtre Koşulu Ekle</span>
        </button>
      </div>
    </div>
  );
};

import { ColumnMeta, DataRow, DateFilterState, FilterGroup, FilterRule } from '../types';
import { parseCustomDate, parseNumber } from './parser';

export function evaluateRule(row: DataRow, rule: FilterRule, colMeta?: ColumnMeta): boolean {
  const { column, operator, value, value2 } = rule;
  const rawVal = row[column];

  // Array handling (e.g. Etiketler)
  if (Array.isArray(rawVal)) {
    if (operator === 'is_empty') return rawVal.length === 0;
    if (operator === 'is_not_empty') return rawVal.length > 0;
    if (operator === 'contains') {
      const q = String(value || '').toLowerCase();
      return rawVal.some(item => String(item).toLowerCase().includes(q));
    }
    if (operator === 'equals' || operator === 'in') {
      const targets = Array.isArray(value) ? value : [value];
      return rawVal.some(item => targets.includes(String(item)));
    }
    if (operator === 'not_in') {
      const targets = Array.isArray(value) ? value : [value];
      return !rawVal.some(item => targets.includes(String(item)));
    }
    return true;
  }

  // String / general handling
  const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

  switch (operator) {
    case 'is_empty':
      return strVal === '';
    case 'is_not_empty':
      return strVal !== '';
    case 'equals':
      return strVal.toLowerCase() === String(value || '').toLowerCase();
    case 'not_equals':
      return strVal.toLowerCase() !== String(value || '').toLowerCase();
    case 'contains':
      return strVal.toLowerCase().includes(String(value || '').toLowerCase());
    case 'not_contains':
      return !strVal.toLowerCase().includes(String(value || '').toLowerCase());
    case 'starts_with':
      return strVal.toLowerCase().startsWith(String(value || '').toLowerCase());
    case 'ends_with':
      return strVal.toLowerCase().endsWith(String(value || '').toLowerCase());
    case 'in': {
      const targets = Array.isArray(value) ? value : [value];
      return targets.some(t => strVal.toLowerCase() === String(t).toLowerCase());
    }
    case 'not_in': {
      const targets = Array.isArray(value) ? value : [value];
      return !targets.some(t => strVal.toLowerCase() === String(t).toLowerCase());
    }

    // Numeric operators
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'between': {
      const numVal = parseNumber(rawVal);
      if (numVal === null) return false;
      const targetNum = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(targetNum)) return true;

      if (operator === 'gt') return numVal > targetNum;
      if (operator === 'gte') return numVal >= targetNum;
      if (operator === 'lt') return numVal < targetNum;
      if (operator === 'lte') return numVal <= targetNum;
      if (operator === 'between') {
        const targetNum2 = typeof value2 === 'number' ? value2 : parseFloat(value2);
        if (isNaN(targetNum2)) return numVal >= targetNum;
        return numVal >= targetNum && numVal <= targetNum2;
      }
      return true;
    }

    // Date operators
    case 'date_before':
    case 'date_after':
    case 'date_between':
    case 'date_in_last_days': {
      const rowDate = parseCustomDate(rawVal);
      if (!rowDate) return false;

      if (operator === 'date_before') {
        const targetDate = new Date(value);
        return !isNaN(targetDate.getTime()) && rowDate.getTime() < targetDate.getTime();
      }
      if (operator === 'date_after') {
        const targetDate = new Date(value);
        return !isNaN(targetDate.getTime()) && rowDate.getTime() > targetDate.getTime();
      }
      if (operator === 'date_between') {
        const d1 = new Date(value);
        const d2 = new Date(value2);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return true;
        return rowDate.getTime() >= d1.getTime() && rowDate.getTime() <= d2.getTime();
      }
      if (operator === 'date_in_last_days') {
        const days = parseInt(value, 10);
        if (isNaN(days)) return true;
        const now = new Date().getTime();
        const diffMs = now - rowDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= days;
      }
      return true;
    }

    default:
      return true;
  }
}

export function filterDataset(
  rows: DataRow[],
  filterGroup?: FilterGroup,
  globalSearch?: string,
  quickFacets?: Record<string, string[]>,
  columnMetaMap?: Map<string, ColumnMeta>,
  dateFilter?: DateFilterState,
  workStartDateCol?: string,
  dueCol?: string
): DataRow[] {
  let result = rows;

  // 1. Dedicated Date Filters (Başlangıç, Yapıma Başlandı, Bitiş Tarihi)
  if (dateFilter) {
    const { baselineCol, startDate, endDate, workStartedFilter, dueFilter } = dateFilter;

    // A) Baseline Date Range Filter
    if ((startDate || endDate) && baselineCol) {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
      const endMs = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

      result = result.filter(row => {
        const rowDate = parseCustomDate(row[baselineCol]);
        if (!rowDate) return false;
        const time = rowDate.getTime();
        if (startMs !== null && time < startMs) return false;
        if (endMs !== null && time > endMs) return false;
        return true;
      });
    }

    // B) Yapıma Başlandı Filter
    if (workStartedFilter && workStartedFilter !== 'all' && workStartDateCol) {
      result = result.filter(row => {
        const val = row[workStartDateCol];
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
        return workStartedFilter === 'filled' ? hasVal : !hasVal;
      });
    }

    // C) Bitiş Tarihi Filter
    if (dueFilter && dueFilter !== 'all' && dueCol) {
      result = result.filter(row => {
        const val = row[dueCol];
        const hasVal = val !== undefined && val !== null && String(val).trim() !== '';
        return dueFilter === 'filled' ? hasVal : !hasVal;
      });
    }
  }

  // 2. Global Search (strictly within selected/active columns when columnMetaMap is provided)
  if (globalSearch && globalSearch.trim()) {
    const q = globalSearch.toLowerCase().trim();
    const activeKeys = columnMetaMap && columnMetaMap.size > 0 ? Array.from(columnMetaMap.keys()) : null;
    result = result.filter(row => {
      const valuesToSearch = activeKeys ? activeKeys.map(k => row[k]) : Object.values(row);
      return valuesToSearch.some(val => {
        if (val === null || val === undefined) return false;
        if (Array.isArray(val)) {
          return val.some(v => String(v).toLowerCase().includes(q));
        }
        return String(val).toLowerCase().includes(q);
      });
    });
  }

  // 3. Quick Facet Selections
  if (quickFacets && Object.keys(quickFacets).length > 0) {
    Object.entries(quickFacets).forEach(([colKey, selectedVals]) => {
      if (!selectedVals || selectedVals.length === 0) return;
      result = result.filter(row => {
        const rowVal = row[colKey];
        if (Array.isArray(rowVal)) {
          return rowVal.some(item => selectedVals.includes(String(item)));
        }
        return selectedVals.includes(String(rowVal || ''));
      });
    });
  }

  // 4. Complex Filter Group (AND / OR)
  if (filterGroup && filterGroup.rules.length > 0) {
    const activeRules = filterGroup.rules.filter(r => r.column);
    if (activeRules.length > 0) {
      if (filterGroup.logicalOperator === 'AND') {
        result = result.filter(row =>
          activeRules.every(rule => evaluateRule(row, rule, columnMetaMap?.get(rule.column)))
        );
      } else {
        result = result.filter(row =>
          activeRules.some(rule => evaluateRule(row, rule, columnMetaMap?.get(rule.column)))
        );
      }
    }
  }

  return result;
}

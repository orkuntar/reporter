import { ChartConfig, ColumnMeta, DataRow, DateGranularity } from '../types';
import { parseCustomDate, parseNumber } from './parser';

export interface AggregationResultItem {
  label: string;
  value: number;
  percentage?: number;
  subSeries?: Record<string, number>;
  count?: number;
  _sortTs?: number;
  [key: string]: any;
}

function formatDateBucket(date: Date, granularity: DateGranularity): { label: string; sortTs: number } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  if (granularity === 'year') {
    return { label: `${y}`, sortTs: new Date(y, 0, 1).getTime() };
  }
  if (granularity === 'month') {
    return { label: `${y}-${m}`, sortTs: new Date(y, date.getMonth(), 1).getTime() };
  }
  if (granularity === 'week') {
    const dayOfWeek = date.getDay();
    const diffToMon = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(y, date.getMonth(), date.getDate() + diffToMon);
    const wy = monday.getFullYear();
    const wm = String(monday.getMonth() + 1).padStart(2, '0');
    const wd = String(monday.getDate()).padStart(2, '0');
    return { label: `${wy}-${wm}-${wd} (Hft)`, sortTs: monday.getTime() };
  }
  return { label: `${y}-${m}-${d}`, sortTs: new Date(y, date.getMonth(), date.getDate()).getTime() };
}

function advanceDateBucket(date: Date, granularity: DateGranularity): Date {
  if (granularity === 'year') return new Date(date.getFullYear() + 1, 0, 1);
  if (granularity === 'month') return new Date(date.getFullYear(), date.getMonth() + 1, 1);
  if (granularity === 'week') return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function aggregateData(
  rows: DataRow[],
  config: ChartConfig,
  columnMetaMap: Map<string, ColumnMeta>
): AggregationResultItem[] {
  const {
    xAxisCol,
    yAxisCol,
    aggregation,
    groupByCol,
    dateGranularity,
    includeSubValues,
    topN = 10,
    sortBy = 'value_desc',
  } = config;

  if (!xAxisCol) return [];

  const xColMeta = columnMetaMap.get(xAxisCol);
  const isDateCol = Boolean(
    xColMeta?.type === 'date' ||
    xColMeta?.isDateColumn ||
    xAxisCol.toLowerCase().includes('tarih') ||
    xAxisCol.toLowerCase().includes('oluşturulan') ||
    xAxisCol.toLowerCase().includes('güncellendi')
  );

  const effectiveGranularity: DateGranularity = isDateCol
    ? (dateGranularity || 'day')
    : 'raw';
  const useDateBucketing = isDateCol && effectiveGranularity !== 'raw';

  const groups: Record<
    string,
    {
      sum: number;
      count: number;
      min: number;
      max: number;
      sortTs: number;
      sub: Record<string, { sum: number; count: number; min: number; max: number }>;
    }
  > = {};
  const allSubKeys = new Set<string>();

  rows.forEach(row => {
    let subKey: string | null = null;
    if (groupByCol) {
      const rawSub = row[groupByCol];
      subKey = rawSub !== undefined && rawSub !== null && String(rawSub).trim() !== ''
        ? String(rawSub).trim()
        : '(Boş)';

      if (includeSubValues && includeSubValues.length > 0 && !includeSubValues.includes(subKey)) {
        return;
      }
    }

    const rawX = row[xAxisCol];
    let xEntries: { label: string; sortTs: number }[] = [];

    if (useDateBucketing) {
      const parsedDate = parseCustomDate(rawX);
      if (!parsedDate) return;
      xEntries = [formatDateBucket(parsedDate, effectiveGranularity)];
    } else if (Array.isArray(rawX)) {
      xEntries = rawX.length > 0
        ? rawX.map(v => ({ label: String(v), sortTs: 0 }))
        : [{ label: '(Yok)', sortTs: 0 }];
    } else {
      const lbl = rawX !== undefined && rawX !== null && String(rawX).trim() !== ''
        ? String(rawX).trim()
        : '(Boş)';
      xEntries = [{ label: lbl, sortTs: 0 }];
    }

    let numY = 1;
    if (yAxisCol) {
      const parsedY = parseNumber(row[yAxisCol]);
      numY = parsedY !== null ? parsedY : 0;
    }

    if (subKey) allSubKeys.add(subKey);

    xEntries.forEach(({ label: xVal, sortTs }) => {
      if (!groups[xVal]) {
        groups[xVal] = { sum: 0, count: 0, min: Infinity, max: -Infinity, sortTs, sub: {} };
      }
      const g = groups[xVal];
      g.count += 1;
      g.sum += numY;
      g.min = Math.min(g.min, numY);
      g.max = Math.max(g.max, numY);

      if (subKey) {
        if (!g.sub[subKey]) {
          g.sub[subKey] = { sum: 0, count: 0, min: Infinity, max: Infinity };
          g.sub[subKey].max = -Infinity;
        }
        const s = g.sub[subKey];
        s.count += 1;
        s.sum += numY;
        s.min = Math.min(s.min, numY);
        s.max = Math.max(s.max, numY);
      }
    });
  });

  const subKeysList = Array.from(allSubKeys).sort();

  let items: AggregationResultItem[] = Object.entries(groups).map(([label, stats]) => {
    let finalVal = stats.count;
    if (aggregation === 'sum') finalVal = stats.sum;
    else if (aggregation === 'avg') finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
    else if (aggregation === 'min') finalVal = stats.min === Infinity ? 0 : stats.min;
    else if (aggregation === 'max') finalVal = stats.max === -Infinity ? 0 : stats.max;

    const subValuesObj: Record<string, number> = {};
    subKeysList.forEach(sk => {
      const sStats = stats.sub[sk];
      if (!sStats) {
        subValuesObj[sk] = 0;
      } else {
        let sVal = sStats.count;
        if (aggregation === 'sum') sVal = sStats.sum;
        else if (aggregation === 'avg') sVal = sStats.count > 0 ? sStats.sum / sStats.count : 0;
        else if (aggregation === 'min') sVal = sStats.min === Infinity ? 0 : sStats.min;
        else if (aggregation === 'max') sVal = sStats.max === -Infinity ? 0 : sStats.max;
        subValuesObj[sk] = Math.round(sVal * 100) / 100;
      }
    });

    return {
      label,
      value: Math.round(finalVal * 100) / 100,
      count: stats.count,
      _sortTs: stats.sortTs,
      ...subValuesObj,
    };
  });

  // Sort
  if (useDateBucketing || sortBy === 'date_asc') {
    items.sort((a, b) => (a._sortTs || 0) - (b._sortTs || 0));
  } else if (sortBy === 'value_desc') {
    items.sort((a, b) => b.value - a.value);
  } else if (sortBy === 'value_asc') {
    items.sort((a, b) => a.value - b.value);
  } else if (sortBy === 'label_asc') {
    items.sort((a, b) => a.label.localeCompare(b.label, 'tr-TR'));
  }

  // Time continuity: fill missing date buckets with 0 for continuous trend curves
  if (useDateBucketing && items.length >= 2) {
    const existingByLabel = new Map(items.map(it => [it.label, it]));
    const filled: AggregationResultItem[] = [];
    const minTs = items[0]._sortTs || 0;
    const maxTs = items[items.length - 1]._sortTs || 0;

    if (minTs > 0 && maxTs > minTs) {
      let cursor = new Date(minTs);
      let safety = 0;
      const subZeroes: Record<string, number> = {};
      subKeysList.forEach(sk => (subZeroes[sk] = 0));

      while (cursor.getTime() <= maxTs && safety < 366) {
        const bucket = formatDateBucket(cursor, effectiveGranularity);
        const found = existingByLabel.get(bucket.label);
        if (found) {
          filled.push(found);
        } else {
          filled.push({
            label: bucket.label,
            value: 0,
            count: 0,
            _sortTs: bucket.sortTs,
            ...subZeroes,
          });
        }
        cursor = advanceDateBucket(cursor, effectiveGranularity);
        safety++;
      }

      if (filled.length > 0 && safety < 366) {
        items = filled;
      }
    }
  }

  // Top N & "Other" aggregation only for non-time-series categorical charts
  if (!useDateBucketing && topN && items.length > topN) {
    const topItems = items.slice(0, topN);
    const otherItems = items.slice(topN);
    const otherVal = otherItems.reduce((acc, curr) => acc + curr.value, 0);
    const otherCount = otherItems.reduce((acc, curr) => acc + (curr.count || 0), 0);

    const otherObj: AggregationResultItem = {
      label: 'Diğer',
      value: Math.round(otherVal * 100) / 100,
      count: otherCount,
    };
    subKeysList.forEach(sk => {
      otherObj[sk] = otherItems.reduce((acc, curr) => acc + (Number(curr[sk]) || 0), 0);
    });

    topItems.push(otherObj);
    items = topItems;
  }

  // Calculate percentages
  const totalSum = items.reduce((acc, item) => acc + item.value, 0);
  items.forEach(item => {
    item.percentage = totalSum > 0 ? Math.round((item.value / totalSum) * 1000) / 10 : 0;
  });

  return items;
}

export interface PivotTableData {
  rowLabels: string[];
  colLabels: string[];
  matrix: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

export function computePivotTable(
  rows: DataRow[],
  rowColKey: string,
  colColKey: string,
  valColKey?: string,
  aggregation: 'count' | 'sum' | 'avg' = 'count'
): PivotTableData {
  const rowLabelsSet = new Set<string>();
  const colLabelsSet = new Set<string>();
  const matrix: Record<string, Record<string, { sum: number; count: number }>> = {};

  rows.forEach(r => {
    const rawR = r[rowColKey];
    const rawC = r[colColKey];

    const rLabel = rawR !== undefined && rawR !== null && String(rawR).trim() !== '' ? String(rawR).trim() : '(Boş)';
    const cLabel = rawC !== undefined && rawC !== null && String(rawC).trim() !== '' ? String(rawC).trim() : '(Boş)';

    rowLabelsSet.add(rLabel);
    colLabelsSet.add(cLabel);

    let val = 1;
    if (valColKey) {
      const p = parseNumber(r[valColKey]);
      val = p !== null ? p : 0;
    }

    if (!matrix[rLabel]) matrix[rLabel] = {};
    if (!matrix[rLabel][cLabel]) matrix[rLabel][cLabel] = { sum: 0, count: 0 };

    matrix[rLabel][cLabel].sum += val;
    matrix[rLabel][cLabel].count += 1;
  });

  const rowLabels = Array.from(rowLabelsSet).sort((a, b) => a.localeCompare(b, 'tr-TR'));
  const colLabels = Array.from(colLabelsSet).sort((a, b) => a.localeCompare(b, 'tr-TR'));

  const finalMatrix: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  colLabels.forEach(c => (colTotals[c] = 0));

  rowLabels.forEach(r => {
    finalMatrix[r] = {};
    let rTotal = 0;

    colLabels.forEach(c => {
      const cell = matrix[r]?.[c];
      let res = 0;
      if (cell) {
        if (aggregation === 'sum') res = cell.sum;
        else if (aggregation === 'avg') res = cell.count > 0 ? cell.sum / cell.count : 0;
        else res = cell.count;
      }
      res = Math.round(res * 10) / 10;
      finalMatrix[r][c] = res;
      rTotal += res;
      colTotals[c] += res;
      grandTotal += res;
    });

    rowTotals[r] = Math.round(rTotal * 10) / 10;
  });

  Object.keys(colTotals).forEach(c => {
    colTotals[c] = Math.round(colTotals[c] * 10) / 10;
  });

  return {
    rowLabels,
    colLabels,
    matrix: finalMatrix,
    rowTotals,
    colTotals,
    grandTotal: Math.round(grandTotal * 10) / 10,
  };
}

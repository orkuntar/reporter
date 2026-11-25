import Papa from 'papaparse';
import { ColumnMeta, ColumnType, DataRow, Dataset } from '../types';

const TURKISH_MONTHS: Record<string, number> = {
  oca: 0,
  şub: 1, sub: 1,
  mar: 2,
  nis: 3,
  may: 4,
  haz: 5,
  tem: 6,
  ağu: 7, agu: 7,
  eyl: 8,
  eki: 9,
  kas: 10,
  ara: 11
};

export function parseCustomDate(raw: any): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw !== 'string') return null;
  const str = raw.trim();
  if (!str) return null;

  // Format: 21/Eki/26 10:04 AM or 21/Eki/2026 10:04 AM
  const jiraMatch = str.match(/^(\d{1,2})[\/\-\.]([a-zA-ZçğıöşüÇĞİÖŞÜ]{3})[\/\-\.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?/i);
  if (jiraMatch) {
    const day = parseInt(jiraMatch[1], 10);
    const mStr = jiraMatch[2].toLowerCase();
    const month = TURKISH_MONTHS[mStr];
    let year = parseInt(jiraMatch[3], 10);
    if (year < 100) year += 2000;

    let hour = jiraMatch[4] ? parseInt(jiraMatch[4], 10) : 0;
    const min = jiraMatch[5] ? parseInt(jiraMatch[5], 10) : 0;
    const ampm = jiraMatch[6] ? jiraMatch[6].toUpperCase() : null;

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      const d = new Date(year, month, day, hour, min, 0);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Format: DD.MM.YYYY or DD/MM/YYYY
  const standardDateMatch = str.match(/^(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})/);
  if (standardDateMatch) {
    const day = parseInt(standardDateMatch[1], 10);
    const month = parseInt(standardDateMatch[2], 10) - 1;
    const year = parseInt(standardDateMatch[3], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Standard ISO / JS Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
    return parsed;
  }

  return null;
}

export function parseNumber(val: any): number | null {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (!val || typeof val !== 'string') return null;
  const cleaned = val.trim().replace(/\s/g, '').replace(/[^\d.,\-+]/g, '');
  if (!cleaned) return null;

  let numStr = cleaned;
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    numStr = cleaned.replace(',', '.');
  } else if (cleaned.includes('.') && cleaned.includes(',')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      numStr = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      numStr = cleaned.replace(/,/g, '');
    }
  }

  const num = parseFloat(numStr);
  return isNaN(num) ? null : num;
}

export function computeColumnMetadata(rows: DataRow[], allColumnKeys: string[]): ColumnMeta[] {
  return allColumnKeys.map(key => {
    let numericCount = 0;
    let dateCount = 0;
    let nonEmpCount = 0;
    let isArray = false;

    const valueFreq: Record<string, number> = {};
    let minNum = Infinity;
    let maxNum = -Infinity;
    let sumNum = 0;
    let minDateVal: Date | null = null;
    let maxDateVal: Date | null = null;

    rows.forEach(r => {
      const val = r[key];
      if (Array.isArray(val)) {
        isArray = true;
        if (val.length > 0) nonEmpCount++;
        val.forEach(item => {
          const s = String(item).trim();
          if (s) valueFreq[s] = (valueFreq[s] || 0) + 1;
        });
        return;
      }

      if (val === undefined || val === null || val === '') return;
      nonEmpCount++;
      const sVal = String(val);

      valueFreq[sVal] = (valueFreq[sVal] || 0) + 1;

      const pNum = parseNumber(val);
      if (pNum !== null && !isNaN(pNum)) {
        numericCount++;
        minNum = Math.min(minNum, pNum);
        maxNum = Math.max(maxNum, pNum);
        sumNum += pNum;
      }

      const pDate = parseCustomDate(val);
      if (pDate !== null) {
        dateCount++;
        if (!minDateVal || pDate < minDateVal) minDateVal = pDate;
        if (!maxDateVal || pDate > maxDateVal) maxDateVal = pDate;
      }
    });

    const uniqueCount = Object.keys(valueFreq).length;
    let type: ColumnType = 'string';

    if (isArray) {
      type = 'array';
    } else if (nonEmpCount > 0 && dateCount / nonEmpCount >= 0.75) {
      type = 'date';
    } else if (nonEmpCount > 0 && numericCount / nonEmpCount >= 0.85) {
      type = 'number';
    } else if (uniqueCount > 0 && uniqueCount <= 25 && nonEmpCount > 20) {
      type = 'category';
    }

    const topValues = Object.entries(valueFreq)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const isDateCol = type === 'date' || (dateCount > 0 && dateCount / nonEmpCount > 0.5);

    let cleanLabel = key;
    if (key.startsWith('_derived_')) {
      cleanLabel = key.replace('_derived_', '').replace(/_/g, ' ').toUpperCase();
    } else if (key.startsWith('_merged_')) {
      cleanLabel = key.replace('_merged_', '') + ' (Tümü)';
    }

    return {
      key,
      label: cleanLabel,
      type,
      uniqueCount,
      missingCount: rows.length - nonEmpCount,
      totalCount: rows.length,
      topValues,
      min: numericCount > 0 ? minNum : undefined,
      max: numericCount > 0 ? maxNum : undefined,
      sum: numericCount > 0 ? Math.round(sumNum * 100) / 100 : undefined,
      avg: numericCount > 0 ? Math.round((sumNum / numericCount) * 100) / 100 : undefined,
      minDate: minDateVal ? (minDateVal as Date).toISOString().split('T')[0] : undefined,
      maxDate: maxDateVal ? (maxDateVal as Date).toISOString().split('T')[0] : undefined,
      isDateColumn: isDateCol,
    };
  });
}

function computeDerivedJiraFields(rows: DataRow[], jiraFields: Dataset['jiraFields']) {
  const fields = jiraFields || {};
  rows.forEach(r => {
    // Cycle time / Lead time in days
    const startRef = fields.startDateCol ? r[fields.startDateCol] : (fields.createdCol ? r[fields.createdCol] : null);
    const endRef = fields.dueCol ? r[fields.dueCol] : (fields.resolvedCol ? r[fields.resolvedCol] : null);

    if (startRef && endRef) {
      const sDate = parseCustomDate(startRef);
      const eDate = parseCustomDate(endRef);
      if (sDate && eDate) {
        const diffDays = Math.max(0, (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
        r['_derived_lead_time_days'] = Math.round(diffDays * 10) / 10;
      } else {
        r['_derived_lead_time_days'] = null;
      }
    } else {
      delete r['_derived_lead_time_days'];
    }

    // Normalized status category
    if (fields.statusCol) {
      const st = String(r[fields.statusCol] || '').toLowerCase();
      if (st.includes('tamam') || st.includes('bitti') || st.includes('done') || st.includes('closed') || st.includes('çözüldü')) {
        r['_derived_status_bucket'] = 'Tamamlandı';
      } else if (st.includes('devam') || st.includes('in progress') || st.includes('yapılıyor') || st.includes('test') || st.includes('review')) {
        r['_derived_status_bucket'] = 'Devam Ediyor';
      } else if (st.includes('iptal') || st.includes('cancelled') || st.includes('rejected')) {
        r['_derived_status_bucket'] = 'İptal Edildi';
      } else {
        r['_derived_status_bucket'] = 'Yapılacak';
      }
    } else {
      delete r['_derived_status_bucket'];
    }

    // Priority ranking score
    if (fields.priorityCol) {
      const pr = String(r[fields.priorityCol] || '').toLowerCase();
      if (pr.includes('highest') || pr.includes('en yüksek') || pr.includes('kritik') || pr.includes('critical')) {
        r['_derived_priority_score'] = 5;
      } else if (pr.includes('high') || pr.includes('yüksek')) {
        r['_derived_priority_score'] = 4;
      } else if (pr.includes('medium') || pr.includes('orta')) {
        r['_derived_priority_score'] = 3;
      } else if (pr.includes('low') || pr.includes('düşük')) {
        r['_derived_priority_score'] = 2;
      } else {
        r['_derived_priority_score'] = 1;
      }
    } else {
      delete r['_derived_priority_score'];
    }
  });
}

/**
 * Automatically detects semantic Jira/workflow field roles from column keys.
 * All detected fields remain optional and can be reassigned or cleared by the client.
 */
export function detectJiraFields(columnKeys: string[]): NonNullable<Dataset['jiraFields']> {
  const keySet = new Set(columnKeys);
  const jiraFields: NonNullable<Dataset['jiraFields']> = {};

  const resolveMergedOrRaw = (k: string): string => {
    const base = k.split('__')[0];
    const merged = `_merged_${base}`;
    return keySet.has(merged) ? merged : k;
  };

  columnKeys.forEach(k => {
    if (k.startsWith('_derived_') || k.startsWith('_merged_')) return;
    const lk = k.toLowerCase();
    if ((lk === 'özet' || lk === 'summary') && !jiraFields.summaryCol) jiraFields.summaryCol = k;
    if ((lk === 'konu anahtarı' || lk === 'issue key' || lk === 'key') && !jiraFields.keyCol) jiraFields.keyCol = k;
    if ((lk === 'konu türü' || lk === 'issue type' || lk === 'type') && !jiraFields.typeCol) jiraFields.typeCol = k;
    if ((lk === 'durum' || lk === 'status') && !jiraFields.statusCol) jiraFields.statusCol = k;
    if ((lk === 'öncelik' || lk === 'priority') && !jiraFields.priorityCol) jiraFields.priorityCol = k;
    if ((lk === 'atanan kişi' || lk === 'assignee') && !jiraFields.assigneeCol) jiraFields.assigneeCol = k;
    if ((lk === 'oluşturulan' || lk === 'created') && !jiraFields.createdCol) jiraFields.createdCol = k;
    if ((lk === 'çözülme tarihi' || lk === 'resolved') && !jiraFields.resolvedCol) jiraFields.resolvedCol = k;
    if ((lk === 'bitiş tarihi' || lk === 'due date') && !jiraFields.dueCol) jiraFields.dueCol = k;
    if ((lk.startsWith('etiketler') || lk.startsWith('labels')) && !jiraFields.labelsCol) {
      jiraFields.labelsCol = resolveMergedOrRaw(k);
    }
    if ((lk.includes('talep eden departman') || lk.includes('department')) && !jiraFields.departmentCol) {
      jiraFields.departmentCol = k;
    }
    if ((lk.includes('talep sahibi') || lk.includes('requester')) && !jiraFields.requesterCol) {
      jiraFields.requesterCol = k;
    }
    if ((lk.includes('ortam') || lk.includes('environment')) && !jiraFields.environmentCol) {
      jiraFields.environmentCol = resolveMergedOrRaw(k);
    }
    if ((lk.includes('başlangıç tarihi') || lk.includes('start date')) && !jiraFields.startDateCol) {
      jiraFields.startDateCol = k;
    }
    if ((lk.includes('yapım başlama tarihi') || lk.includes('work start')) && !jiraFields.workStartDateCol) {
      jiraFields.workStartDateCol = k;
    }
    if ((lk.includes('ilgili modül') || lk.includes('module')) && !jiraFields.moduleCol) {
      jiraFields.moduleCol = resolveMergedOrRaw(k);
    }
  });

  return jiraFields;
}

export function decodeCsvArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    try {
      return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    } catch {
      // fall through
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('windows-1254').decode(bytes);
    } catch {
      return new TextDecoder('utf-8').decode(bytes);
    }
  }
}

export function parseCsvFile(content: string, fileName: string, fileSize: number): Dataset {
  const parsed = Papa.parse(content, {
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    delimitersToGuess: [',', ';', '\t', '|'],
  });

  const rawRows = parsed.data as string[][];
  if (rawRows.length === 0) {
    throw new Error('CSV dosyası boş veya okunamadı.');
  }

  const rawHeaders = rawRows[0];
  const dataRowsRaw = rawRows.slice(1);

  // Identify duplicate column headers (e.g. Etiketler, Ortam)
  const headerCount: Record<string, number> = {};
  const columnKeys: string[] = [];
  const columnLabels: string[] = [];

  rawHeaders.forEach((h, idx) => {
    const label = (h || `Col_${idx + 1}`).trim();
    headerCount[label] = (headerCount[label] || 0) + 1;
    const key = headerCount[label] > 1 ? `${label}__${headerCount[label]}` : label;
    columnKeys.push(key);
    columnLabels.push(label);
  });

  // Track merged multi-columns
  const multiColumnGroups: Record<string, string[]> = {};
  columnKeys.forEach((key) => {
    const baseName = key.includes('__') ? key.split('__')[0] : key;
    if (headerCount[baseName] > 1) {
      if (!multiColumnGroups[baseName]) multiColumnGroups[baseName] = [];
      multiColumnGroups[baseName].push(key);
    }
  });

  const mergedKeys = Object.keys(multiColumnGroups).map(base => `_merged_${base}`);
  // Automatically detect Jira / workflow field mappings (user can override or leave blank)
  const jiraFields = detectJiraFields([...columnKeys, ...mergedKeys]);

  const isJira = Boolean(jiraFields.keyCol || jiraFields.summaryCol || jiraFields.statusCol);
  const keyCol = jiraFields.keyCol || 'Konu anahtarı';

  // In-file Jira Key Controller (Deduplication within same CSV)
  const rowsByKey = new Map<string, DataRow>();
  const rows: DataRow[] = [];

  dataRowsRaw.forEach((rawCells, rowIndex) => {
    const rowObj: DataRow = { _id: `row_${rowIndex + 1}` };

    columnKeys.forEach((key, colIndex) => {
      const cellVal = rawCells[colIndex] !== undefined ? String(rawCells[colIndex]).trim() : '';
      rowObj[key] = cellVal;
    });

    // Merge multi-columns into composite array fields
    Object.entries(multiColumnGroups).forEach(([baseName, keys]) => {
      const mergedVals = new Set<string>();
      keys.forEach((k) => {
        const v = rowObj[k];
        if (v && typeof v === 'string') {
          v.split(/[,;\n]/).forEach(item => {
            const clean = item.trim();
            if (clean) mergedVals.add(clean);
          });
        }
      });
      rowObj[`_merged_${baseName}`] = Array.from(mergedVals);
    });

    const currentKey = rowObj[keyCol]?.trim();
    if (currentKey) {
      if (rowsByKey.has(currentKey)) {
        // Mükerrer Jira Key: Güncelle / Merge non-empty fields into the existing record
        const existing = rowsByKey.get(currentKey)!;
        Object.keys(rowObj).forEach(k => {
          if (rowObj[k] !== undefined && rowObj[k] !== '' && k !== '_id') {
            existing[k] = rowObj[k];
          }
        });
      } else {
        rowsByKey.set(currentKey, rowObj);
        rows.push(rowObj);
      }
    } else {
      rows.push(rowObj);
    }
  });

  // Compute derived fields when applicable
  computeDerivedJiraFields(rows, jiraFields);

  // Determine Column Metadata and data types
  const allColumnKeys = [...columnKeys, ...mergedKeys];
  if (rows.some(r => r['_derived_lead_time_days'] !== undefined)) allColumnKeys.push('_derived_lead_time_days');
  if (jiraFields.statusCol) allColumnKeys.push('_derived_status_bucket');
  if (jiraFields.priorityCol) allColumnKeys.push('_derived_priority_score');

  const allColumns = computeColumnMetadata(rows, allColumnKeys);
  const rawJiraFields = { ...jiraFields };
  const defaultSelectedKeys = getDefaultSelectedColumnKeys(allColumns);

  const baseDataset: Dataset = {
    id: `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: fileName.replace(/\.[^/.]+$/, ''),
    sourceType: isJira ? 'jira' : 'generic',
    sourceFile: fileName,
    fileSize,
    importedAt: new Date().toISOString(),
    rows,
    columns: allColumns,
    allColumns,
    selectedColumnKeys: defaultSelectedKeys,
    rawJiraFields,
    jiraFields: rawJiraFields,
  };

  return applyDatasetColumnSelection(baseDataset, defaultSelectedKeys, rawJiraFields);
}

/**
 * Returns non-derived selectable columns from the dataset's full column catalog.
 */
export function getSelectableColumns(dataset: Dataset): ColumnMeta[] {
  const catalog = dataset.allColumns && dataset.allColumns.length > 0 ? dataset.allColumns : dataset.columns;
  return catalog.filter(c => !c.key.startsWith('_derived_'));
}

/**
 * Default selected columns: all non-derived columns except duplicate __N sub-columns
 * when a merged array column already represents them.
 */
export function getDefaultSelectedColumnKeys(allColumns: ColumnMeta[]): string[] {
  const mergedBases = new Set(
    allColumns
      .filter(c => c.key.startsWith('_merged_'))
      .map(c => c.key.replace('_merged_', ''))
  );

  return allColumns
    .filter(c => {
      if (c.key.startsWith('_derived_')) return false;
      const dupMatch = c.key.match(/^(.+)__(\d+)$/);
      if (dupMatch && mergedBases.has(dupMatch[1])) {
        return false;
      }
      return true;
    })
    .map(c => c.key);
}

/**
 * Ensures older persisted datasets receive allColumns, rawJiraFields, and selectedColumnKeys.
 */
export function ensureDatasetColumnModel(dataset: Dataset): Dataset {
  const catalog = dataset.allColumns && dataset.allColumns.length > 0 ? dataset.allColumns : dataset.columns;
  const rawJira = dataset.rawJiraFields || dataset.jiraFields || {};
  const selectedKeys =
    dataset.selectedColumnKeys && dataset.selectedColumnKeys.length > 0
      ? dataset.selectedColumnKeys
      : getDefaultSelectedColumnKeys(catalog);

  if (dataset.allColumns && dataset.selectedColumnKeys && dataset.rawJiraFields) {
    return dataset;
  }

  return applyDatasetColumnSelection(
    {
      ...dataset,
      allColumns: catalog,
      rawJiraFields: rawJira,
    },
    selectedKeys,
    rawJira
  );
}

/**
 * Applies the client's checked column keys and optional custom main field mappings
 * so the entire application operates strictly on selected columns & assigned filter groups.
 */
export function applyDatasetColumnSelection(
  dataset: Dataset,
  selectedKeys: string[],
  customRawJiraFields?: Dataset['jiraFields']
): Dataset {
  const baseCatalog = (dataset.allColumns && dataset.allColumns.length > 0 ? dataset.allColumns : dataset.columns)
    .filter(c => !c.key.startsWith('_derived_'));
  const catalogKeySet = new Set(baseCatalog.map(c => c.key));

  // Keep valid non-derived keys chosen by the client
  const cleanedSelected = Array.from(
    new Set(selectedKeys.filter(k => catalogKeySet.has(k)))
  );
  const selectedSet = new Set(cleanedSelected);

  // Normalize custom or existing raw field mapping (allowing empty/unassigned fields)
  const sourceMapping = customRawJiraFields !== undefined
    ? customRawJiraFields
    : (dataset.rawJiraFields || dataset.jiraFields || {});
  const rawJira: NonNullable<Dataset['jiraFields']> = {};
  (Object.keys(sourceMapping) as Array<keyof NonNullable<Dataset['jiraFields']>>).forEach(field => {
    const val = sourceMapping[field];
    if (val && typeof val === 'string' && val.trim() !== '' && catalogKeySet.has(val)) {
      rawJira[field] = val;
    }
  });

  const isFieldActive = (colKey?: string): boolean => {
    if (!colKey) return false;
    if (selectedSet.has(colKey)) return true;
    if (colKey.startsWith('_merged_')) {
      const base = colKey.replace('_merged_', '');
      return selectedSet.has(base);
    }
    if (selectedSet.has(`_merged_${colKey}`)) return true;
    return false;
  };

  const effectiveJiraFields: NonNullable<Dataset['jiraFields']> = {};
  (Object.keys(rawJira) as Array<keyof NonNullable<Dataset['jiraFields']>>).forEach((field) => {
    const colKey = rawJira[field];
    if (colKey && isFieldActive(colKey)) {
      if (selectedSet.has(colKey)) {
        effectiveJiraFields[field] = colKey;
      } else if (colKey.startsWith('_merged_') && selectedSet.has(colKey.replace('_merged_', ''))) {
        effectiveJiraFields[field] = colKey.replace('_merged_', '');
      } else if (!colKey.startsWith('_merged_') && selectedSet.has(`_merged_${colKey}`)) {
        effectiveJiraFields[field] = `_merged_${colKey}`;
      }
    }
  });

  // Recompute derived fields when custom mappings are applied or fields changed
  const rows = dataset.rows;
  computeDerivedJiraFields(rows, effectiveJiraFields);

  const derivedKeys: string[] = [];
  if (effectiveJiraFields.statusCol) derivedKeys.push('_derived_status_bucket');
  if (effectiveJiraFields.priorityCol) derivedKeys.push('_derived_priority_score');
  const hasLeadStart = Boolean(effectiveJiraFields.createdCol || effectiveJiraFields.startDateCol);
  const hasLeadEnd = Boolean(effectiveJiraFields.resolvedCol || effectiveJiraFields.dueCol);
  if (hasLeadStart && hasLeadEnd && rows.some(r => typeof r['_derived_lead_time_days'] === 'number')) {
    derivedKeys.push('_derived_lead_time_days');
  }

  const derivedMetas = derivedKeys.length > 0 ? computeColumnMetadata(rows, derivedKeys) : [];
  const fullCatalog = [...baseCatalog, ...derivedMetas];
  const activeColumns = [
    ...baseCatalog.filter(c => selectedSet.has(c.key)),
    ...derivedMetas,
  ];

  const hasJiraCore = Boolean(
    effectiveJiraFields.keyCol ||
    effectiveJiraFields.summaryCol ||
    effectiveJiraFields.statusCol ||
    effectiveJiraFields.startDateCol ||
    effectiveJiraFields.dueCol
  );

  return {
    ...dataset,
    sourceType: hasJiraCore ? 'jira' : 'generic',
    allColumns: fullCatalog,
    selectedColumnKeys: cleanedSelected,
    columns: activeColumns,
    rawJiraFields: rawJira,
    jiraFields: effectiveJiraFields,
  };
}

export interface UpsertResult {
  updatedCount: number;
  insertedCount: number;
  totalCount: number;
  dataset: Dataset;
}

/**
 * Jira Key Controller - Upsert Engine:
 * Ingests incoming dataset into an existing dataset.
 * - If Jira Key already exists: updates the record with newer values.
 * - If Jira Key is new: inserts it as a new record.
 * - Ensures ZERO duplicates!
 */
export function upsertDataset(
  existingDataset: Dataset,
  incomingDataset: Dataset
): UpsertResult {
  const existingNorm = ensureDatasetColumnModel(existingDataset);
  const incomingNorm = ensureDatasetColumnModel(incomingDataset);

  const existingRawJira = existingNorm.rawJiraFields || existingNorm.jiraFields || {};
  const incomingRawJira = incomingNorm.rawJiraFields || incomingNorm.jiraFields || {};
  const keyCol = existingRawJira.keyCol || incomingRawJira.keyCol || 'Konu anahtarı';
  
  // Index existing rows by Key
  const existingKeyMap = new Map<string, { row: DataRow; index: number }>();
  existingNorm.rows.forEach((r, idx) => {
    const k = r[keyCol]?.trim();
    if (k) existingKeyMap.set(k, { row: r, index: idx });
  });

  const mergedRows = [...existingNorm.rows];
  let updatedCount = 0;
  let insertedCount = 0;

  incomingNorm.rows.forEach((incomingRow) => {
    const k = incomingRow[keyCol]?.trim();

    if (k && existingKeyMap.has(k)) {
      // Key exists -> UPDATE existing record with incoming data
      const { index, row } = existingKeyMap.get(k)!;
      const updatedRow = { ...row, ...incomingRow, _id: row._id }; // keep stable internal id
      mergedRows[index] = updatedRow;
      existingKeyMap.set(k, { row: updatedRow, index });
      updatedCount++;
    } else {
      // New key -> INSERT new row
      const newRow = { ...incomingRow, _id: `row_${mergedRows.length + 1}` };
      mergedRows.push(newRow);
      if (k) existingKeyMap.set(k, { row: newRow, index: mergedRows.length - 1 });
      insertedCount++;
    }
  });

  const combinedRawJira = { ...incomingRawJira, ...existingRawJira };

  // Re-calculate derived fields using full Jira metadata
  if (combinedRawJira.keyCol || combinedRawJira.summaryCol || combinedRawJira.statusCol) {
    computeDerivedJiraFields(mergedRows, combinedRawJira);
  }

  // Union of all columns from existing and incoming full catalogs
  const existingAll = existingNorm.allColumns || existingNorm.columns;
  const incomingAll = incomingNorm.allColumns || incomingNorm.columns;
  const existingColKeys = new Set(existingAll.map(c => c.key));
  const combinedColKeys = [...existingAll.map(c => c.key)];
  incomingAll.forEach(col => {
    if (!existingColKeys.has(col.key)) {
      combinedColKeys.push(col.key);
      existingColKeys.add(col.key);
    }
  });

  const recomputedAllColumns = computeColumnMetadata(mergedRows, combinedColKeys);

  // Preserve union of selected column keys (existing selection + incoming selection)
  const existingSelected = existingNorm.selectedColumnKeys || getDefaultSelectedColumnKeys(existingAll);
  const incomingSelected = incomingNorm.selectedColumnKeys || getDefaultSelectedColumnKeys(incomingAll);
  const mergedSelectedKeys = Array.from(new Set([...existingSelected, ...incomingSelected]));

  const updatedDataset = applyDatasetColumnSelection(
    {
      ...existingNorm,
      rows: mergedRows,
      allColumns: recomputedAllColumns,
      rawJiraFields: combinedRawJira,
      columns: recomputedAllColumns,
      fileSize: existingNorm.fileSize + incomingNorm.fileSize,
      importedAt: new Date().toISOString(),
    },
    mergedSelectedKeys
  );

  return {
    updatedCount,
    insertedCount,
    totalCount: mergedRows.length,
    dataset: updatedDataset,
  };
}

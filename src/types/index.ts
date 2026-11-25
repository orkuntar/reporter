export type ColumnType = 'string' | 'number' | 'date' | 'category' | 'array';

export interface ColumnMeta {
  key: string;
  label: string;
  type: ColumnType;
  uniqueCount: number;
  missingCount: number;
  totalCount: number;
  topValues: { value: string; count: number }[];
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  minDate?: string;
  maxDate?: string;
  isDateColumn?: boolean;
}

export interface DataRow {
  _id: string;
  [key: string]: any;
}

export interface Dataset {
  id: string;
  name: string;
  sourceType: 'jira' | 'generic';
  sourceFile: string;
  fileSize: number;
  importedAt: string;
  rows: DataRow[];
  columns: ColumnMeta[];
  jiraFields?: {
    keyCol?: string;
    summaryCol?: string;
    typeCol?: string;
    statusCol?: string;
    priorityCol?: string;
    assigneeCol?: string;
    createdCol?: string;
    resolvedCol?: string;
    dueCol?: string;
    labelsCol?: string;
    departmentCol?: string;
    moduleCol?: string;
    startDateCol?: string;
    workStartDateCol?: string;
    environmentCol?: string;
    requesterCol?: string;
  };
}

export interface DateFilterState {
  baselineCol: string;
  startDate: string;   // 'YYYY-MM-DD'
  endDate: string;     // 'YYYY-MM-DD'
  workStartedFilter: 'all' | 'filled' | 'empty';
  dueFilter: 'all' | 'filled' | 'empty';
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'not_in'
  | 'date_before'
  | 'date_after'
  | 'date_between'
  | 'date_in_last_days';

export interface FilterRule {
  id: string;
  column: string;
  operator: FilterOperator;
  value: any;
  value2?: any;
}

export interface FilterGroup {
  id: string;
  logicalOperator: 'AND' | 'OR';
  rules: FilterRule[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  group: FilterGroup;
  dateFilter?: DateFilterState;
  createdAt: string;
}

export type ChartType =
  | 'bar_vertical'
  | 'bar_horizontal'
  | 'bar_stacked'
  | 'line'
  | 'area'
  | 'donut'
  | 'scatter'
  | 'radar'
  | 'treemap'
  | 'pivot';

export type DateGranularity = 'day' | 'week' | 'month' | 'year' | 'raw';

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  xAxisCol: string;
  yAxisCol?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
  groupByCol?: string;
  dateGranularity?: DateGranularity;
  stackedSeries?: boolean;
  includeSubValues?: string[];
  topN?: number;
  sortBy?: 'value_desc' | 'value_asc' | 'label_asc' | 'date_asc';
  colorPalette?: 'monochrome' | 'technical' | 'cyber' | 'emerald' | 'warm';
}

export interface SavedReport {
  id: string;
  title: string;
  description: string;
  chartConfigs: ChartConfig[];
  filterGroup?: FilterGroup;
  dateFilter?: DateFilterState;
  createdAt: string;
  updatedAt: string;
}

export type AppView =
  | 'overview'
  | 'charts'
  | 'jira_analytics'
  | 'audit_report'
  | 'grid'
  | 'pivot'
  | 'composer'
  | 'schema';

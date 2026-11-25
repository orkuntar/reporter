# Reporter

**Executive Operational Analytics & Precision CSV Telemetry Engine**

Reporter is a high-density desktop analytics platform engineered with Electron, React, TypeScript, and Recharts. Designed for engineering leadership, PMO teams, and operational stakeholders, it transforms raw Jira and tabular CSV exports into structured executive reporting, compliance audits, and interactive multidimensional visualizations—operating 100% locally and offline with zero cloud dependency.

---

## Executive Summary

Modern delivery organizations often rely on static spreadsheets or fragmented dashboards to track execution velocity, SLA compliance, and data hygiene. Reporter bridges this gap by offering:

- **Zero-Latency Local & Air-Gapped Ingestion**: Parses complex, multi-line CSV exports (UTF-8 BOM, UTF-16 LE/BE, Windows-1254 ANSI, semicolon/comma/tab delimiters, localized Turkish dates, and composite multi-column attributes) directly on the workstation with offline-bundled Montserrat typography.
- **Client-Controlled Column Scope & Semantic Field Mapping**: Enables users at import time or on any loaded dataset to select active columns and assign—or explicitly leave blank—main filter groups (*Start Date*, *Work Started Date*, *End Date*, *Status*, *Department*, *Assignee*, etc.). Every chart, filter, table, search index, and export operates strictly on the active column configuration.
- **Persistent Multi-Dataset Governance**: Maintains an internal library of named datasets with original filename and import timestamp provenance, governed by an automated **Jira Key Upsert Controller** that eliminates duplicate records during incremental imports and protects against accidental deletion with two-step confirmation.
- **Executive Reporting & Native Print/Excel Output**: Combines Monday-style status health indicators, cross-filtered visualizations, persistent executive report layouts, clean `@media print` PDF generation, and native OOXML `.xlsx` workbook exports.

---

## Core Capabilities

### 1. Client Column Selection & Main Filter Group Mapping
- **Granular Column Control**: Select or toggle active columns during CSV ingestion or at any time on an already loaded dataset via presets (*Select All*, *Non-Empty Only*, *Mapped Core Fields*) and type/completeness inspectors.
- **Flexible Semantic Field Assignment**: Automatically detects standard workflow roles (*Start Date*, *Due Date*, *Work Started Date*, *Created*, *Resolved*, *Status*, *Priority*, *Assignee*, *Department*, *Environment*, *Labels*, *Issue Key*, *Summary*) while allowing users to remap fields to custom column headers or leave optional fields unassigned (such as *Work Started Date* when absent).
- **System-Wide Enforcement**: Unchecked columns and unassigned filter groups are automatically excluded across KPI cards, quick facets, date filters, chart axes, global search, record detail drawers, curated tables, and CSV/XLSX/JSON exports.

### 2. Multi-Dataset Governance & Jira Key Controller
- **Persistent Local Workspace**: Save imported CSVs or filtered snapshots as independent named datasets stored securely in the Electron `userData` directory (with IndexedDB fallback), alongside persistent per-dataset Composer layouts and Overview pinned charts.
- **Audit-Grade Metadata Retention**: Custom dataset names are decoupled from source provenance—retaining original CSV filenames (`sourceFile`) and exact ingestion timestamps (`importedAt`).
- **Zero-Duplicate Upsert Engine**: When importing updated exports into an active dataset, the **Jira Key Controller** matches existing keys, updates modified records in place, appends net-new issues, and prevents duplicate entries both across imports and within single files.

### 3. Executive Overview & Monday-Style Telemetry
- **KPI Telemetry Strip**: Tracks Active Scope, Completion Rate, Mean Resolution Cycle Time (with explicit `Tamam` count), and High-Severity Focus.
- **Workflow Status Battery**: Real-time proportional health bar segmented across *Tamamlandı*, *Devam Ediyor*, *Yapılacak*, and *İptal Edildi*.
- **Adaptive Analytical Matrix & Pinned Charts**: Renders workflow status, label frequency, department x status breakdown, assignee workload balance, weekly zero-filled velocity trends, priority distribution, issue types, and requesting departments—plus custom charts pinned directly from Chart Studio and interactive **Cross-Filtering** on click.

### 4. Date Integrity Audit Report (Compliance View)
A dedicated governance view built to surface scheduling and closure hygiene gaps across non-subtask, non-cancelled items:
- **Active Execution Hygiene**: Flags all non-completed, non-cancelled tasks missing a **Start Date** (`Başlangıç Tarihi`).
- **Closure Completeness**: Flags all completed tasks missing a **Start Date** and/or **End Date** (`Bitiş Tarihi`), segmented into missing start only, missing end only, and both missing.
- **Compliance Scoring**: Computes an aggregate Date Compliance Score (%) alongside status/department anomaly breakdowns and a sortable audit table.

### 5. Interactive Chart Studio
- **10 Visualization Formats**: Vertical Bar, Horizontal Bar, Stacked Bar, Donut Ring, Line Trend, Multi-Series Area (regular & stacked), Radar Spider, custom SVG Treemap, dual-column Scatter Plot, and Pivot Matrix.
- **Chronological Time-Series Continuity**: Automatic **Daily, Weekly, Monthly, and Yearly** date aggregation with strict chronological sorting, Turkish month/timestamp parsing, and zero-filling for intermediate empty date buckets.
- **Pin to Overview & Report Composer**: Save studio charts directly onto the Executive Overview dashboard or assemble persistent multi-block executive reports.

### 6. Three-Tier Filtering, Active Breadcrumbs & Command Palette
1. **Dedicated Date Filter Bar**: Choose the baseline date column, apply calendar ranges or instant presets (*Last 7/30/90 Days*, *This Year*), filter on *Work Started* and *End Date* states (shown dynamically when mapped), and jump directly to main field configuration.
2. **Collapsible Quick Facets Sidebar**: Instant multi-select filtering with live record counts, prioritizing user-mapped workflow and category attributes.
3. **Complex Query Builder & Active Filter Bar**: Multi-clause `AND` / `OR` rule engine with searchable select dropdowns, saved filter presets, and a removable single-line active filter chip bar.
4. **Global Command Palette (`Ctrl+K` / `⌘K`)**: Keyboard-first navigation across records, report views, saved datasets, theme switching, column setup, and export actions.

### 7. Sortable Data Views, Native Excel (.xlsx) & PDF Output
- **Curated Filtered Table**: Adapts strictly to selected columns with sortable headers (natural Jira keys, Turkish strings, and localized dates), visual **Sub-Task hierarchy indicators**, consolidated multi-environment badges, and unpaginated print rendering.
- **Export Center**: Exports curated or full active-column scopes to native **Excel Workbook (`.xlsx`)**, **UTF-8 BOM `.csv`** (Turkish Excel compatible), and **`.json`**.
- **Executive Print / PDF (`@media print`)**: Strips all application chrome, unlocks scroll containers, and prints crisp white-paper reports with full unpaginated tables.

---

## Cross-Platform Desktop Experience (Windows & macOS)
- **Windows & Linux**: Custom frameless telemetry title bar with integrated window controls (`minimize`, `maximize`, `close`).
- **macOS (`darwin`)**: Native `hiddenInset` traffic lights with non-overlapping title bar spacing, native macOS Application Menu (`Cmd+C/V/X/A/Z/Q`, Window & View menus), Dock icon integration, `⌘K` shortcut awareness, and double-click zoom support.
- **Multi-Monitor State Persistence**: Saves and validates window bounds (`window-state.json`) against active displays so windows never restore off-screen when external monitors are disconnected.

---

## Architecture

```
Reporter/
├── assets/
│   └── icon.png                # High-resolution 512x512 RGBA desktop & macOS Dock icon
├── electron/
│   ├── main.ts                 # Cross-platform window lifecycle, macOS menu, CSV decoding, PDF/binary IPC
│   └── preload.ts              # Typed ContextBridge API & platform surface
├── public/
│   └── fonts/                  # Offline-bundled Montserrat .woff2 font family & stylesheet
├── src/
│   ├── components/
│   │   ├── charts/             # Theme-aware Recharts engine (cross-filter, Treemap SVG, 2D Scatter)
│   │   ├── common/             # SearchableSelect & sortable CuratedDataTable
│   │   ├── filter/             # DateFilterBar, ActiveFilterBar, QuickFacets, QueryBuilder
│   │   ├── layout/             # Platform-adaptive TitleBar, collapsible Sidebar, telemetry StatusBar
│   │   ├── modals/             # ColumnSelectionModal, CommandPaletteModal, DatasetManager, ImportOptions, Export, RowDetail
│   │   └── views/              # Overview, ChartStudio, JiraAnalytics, AuditReport, DataGrid, Pivot, Composer, Schema
│   ├── core/
│   │   ├── analyticsEngine.ts  # Aggregation, zero-filled date bucketing, pivot computation
│   │   ├── filterEngine.ts     # 3-tier filtering restricted to active selected columns
│   │   ├── parser.ts           # Multi-encoding CSV ingestion, field detection/mapping, Jira Key upsert
│   │   ├── storage.ts          # Persistent dataset storage (Electron filesystem + IndexedDB fallback)
│   │   └── xlsxExport.ts       # Zero-dependency OOXML .xlsx workbook generator
│   ├── i18n/                   # TR / EN localization dictionary & context
│   └── theme/                  # Dark / Light theme state & CSS token orchestration
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`

### Installation & Build

```bash
# 1. Clone the repository
git clone https://github.com/orkuntar/reporter.git
cd reporter

# 2. Install dependencies
npm install

# 3. Build frontend and Electron bundles
npm run build

# 4. Launch desktop application
npm start
```

### Development Mode

```bash
npm run dev
```

---

## Data Privacy & Repository Hygiene

All spreadsheet exports (`*.csv`, `*.xlsx`, `*.xls`, `*.tsv`) and local `sample-data/` directories are strictly excluded via `.gitignore` to ensure operational datasets remain local and are never committed to version control.

# Reporter

**Executive Operational Analytics & Precision CSV Telemetry Engine**

Reporter is a high-density desktop analytics platform engineered with Electron, React, TypeScript, and Recharts. Designed for engineering leadership, PMO teams, and operational stakeholders, it transforms raw Jira and tabular CSV exports into structured executive reporting, compliance audits, and interactive multidimensional visualizations—operating locally with zero cloud dependency.

---

## Executive Summary

Modern delivery organizations often rely on static spreadsheets or fragmented dashboards to track execution velocity, SLA compliance, and data hygiene. Reporter bridges this gap by offering:

- **Zero-Latency Local Ingestion**: Parses complex, multi-line CSV exports (including localized timestamps and composite multi-column attributes) directly on the workstation.
- **Persistent Multi-Dataset Governance**: Maintains an internal library of named datasets with original filename and import timestamp tracking, governed by an automated **Jira Key Upsert Controller** that eliminates duplicate records during incremental imports.
- **Executive & Operational Reporting**: Combines Monday-style status health indicators, workload balance matrices, chronological trend charts, and a dedicated **Date Integrity Audit Report** into a single cohesive workspace.
- **Swiss Architectural Minimalism**: Built on a restrained, emoji-free industrial telemetry aesthetic with Montserrat typography, tabular numerals, and full Dark / Light mode parity.

---

## Core Capabilities

### 1. Multi-Dataset Governance & Jira Key Controller
- **Persistent Local Workspace**: Save imported CSVs or filtered snapshots as independent named datasets stored securely in the Electron `userData` directory (with IndexedDB fallback). Switch, rename, or manage datasets without overwriting existing baselines.
- **Audit-Grade Metadata Retention**: Custom dataset names are decoupled from source provenance—retaining original CSV filenames (`sourceFile`) and exact ingestion timestamps (`importedAt`).
- **Zero-Duplicate Upsert Engine**: When importing updated exports into an active dataset, the **Jira Key Controller** matches existing keys (`Konu anahtarı`), updates modified records in place, appends net-new issues, and prevents duplicate entries both across imports and within single files.

### 2. Executive Overview & Monday-Style Telemetry
- **KPI Telemetry Strip**: Tracks Active Scope, Completion Rate, Mean Resolution Cycle Time (with explicit `Tamam` count), and High-Severity Focus.
- **Workflow Status Battery**: Real-time proportional health bar segmented across *Tamamlandı*, *Devam Ediyor*, *Yapılacak*, and *İptal Edildi*.
- **8-Chart Analytical Matrix**:
  - Workflow Status Distribution (Donut)
  - Label Frequency Analysis (`BUG`, `FEATURE`, `REVISION`, etc.)
  - Department x Status Breakdown (Stacked Board Matrix)
  - Assignee Workload & Status Balance
  - Weekly Workflow Velocity (Stacked Area Trend)
  - Priority Distribution, Issue Type Composition, and Requesting Department Volume

### 3. Date Integrity Audit Report (Compliance View)
A dedicated governance view built to surface scheduling and closure hygiene gaps across non-subtask, non-cancelled items:
- **Active Execution Hygiene**: Flags all non-completed, non-cancelled tasks missing a **Start Date** (`Başlangıç Tarihi`).
- **Closure Completeness**: Flags all completed tasks missing a **Start Date** and/or **End Date** (`Bitiş Tarihi`), segmented into missing start only, missing end only, and both missing.
- **Compliance Scoring**: Computes an aggregate Date Compliance Score (%) alongside status/department anomaly breakdowns and an exportable raw audit table.

### 4. Interactive Chart Studio
- **9 Visualization Formats**: Vertical Bar, Horizontal Bar, Stacked Bar, Donut Ring, Line Trend, Multi-Series Area (regular & stacked), Radar Spider, Treemap Grid, and Scatter Plot.
- **Chronological Time-Series Bucketing**: Automatic **Daily, Weekly, Monthly, and Yearly** date aggregation with strict chronological sorting and Turkish month/timestamp parsing.
- **Dynamic Series Breakdown & Inline Filtering**: Slice any dimension by a secondary attribute (e.g., *Status* over *Start Date*) and selectively toggle individual series pills directly in the studio.

### 5. Three-Tier Filtering Architecture
1. **Dedicated 3-Axis Date Filter Bar**: Choose the baseline date column (*Start Date*, *Work Started Date*, *End Date*, *Created Date*), apply calendar ranges or instant presets (*Last 7/30/90 Days*, *This Year*), and independently filter on *Work Started* and *End Date* completion states.
2. **Collapsible Quick Facets Sidebar**: Instant multi-select filtering with live record counts—prioritizing *Status*, *Priority*, *Issue Type*, *Department*, *Developer*, *Environment*, and *Labels*.
3. **Complex Query Builder**: Multi-clause `AND` / `OR` rule engine with type-aware operators, **searchable select dropdowns** across 100+ columns, and persistent filter preset management.

### 6. Curated Raw Data Views, Pivot Matrix & Export Center
- **Curated Filtered Table**: Embedded across all report views with 11 core operational columns (*Jira Key, Summary, Status, Department, Requester, Description, Environment, Developer, Start Date, Work Started, End Date*), visual **Sub-Task hierarchy indicators** (`Alt Görev` badges & parent breadcrumbs), inline search, and one-click CSV export.
- **Full Data Grid & Record Inspector**: Inspect all 100+ raw attributes per issue via a searchable modal drawer with JSON copy support.
- **2D Pivot Matrix**: Cross-tabulate any two attributes with *Count*, *Sum*, or *Average* metrics and dynamic heatmap cell shading.
- **Report Composer & Native PDF Export**: Assemble custom multi-block executive reports with commentary notes and export directly to PDF via Electron's native print engine, or export filtered datasets to CSV/JSON.

---

## Interface & Accessibility
- **Bilingual Support**: Full **Turkish (`TR`)** and **English (`EN`)** localization switchable from the title bar.
- **Dual Theme Parity**: Crisp **Dark Slate** and **Swiss Light** modes with synchronized theme-aware Recharts palettes, grids, and tooltips.
- **Collapsible Workspace Chrome**: Both the navigation sidebar and quick facets panel collapse cleanly to maximize analytical canvas space.

---

## Architecture

```
Reporter/
├── electron/
│   ├── main.ts                 # Frameless window lifecycle, file dialogs, PDF export, local dataset IPC
│   └── preload.ts              # Typed ContextBridge API surface
├── src/
│   ├── components/
│   │   ├── charts/             # Theme-aware Recharts visualization engine
│   │   ├── common/             # SearchableSelect & CuratedDataTable (with sub-task hierarchy)
│   │   ├── filter/             # DateFilterBar, QuickFacets, QueryBuilder
│   │   ├── layout/             # Frameless TitleBar, collapsible Sidebar, telemetry StatusBar
│   │   ├── modals/             # DatasetManagerModal, ImportOptionsModal, ExportModal, RowDetailModal
│   │   └── views/              # Overview, ChartStudio, JiraAnalytics, AuditReport, DataGrid, Pivot, Composer, Schema
│   ├── core/
│   │   ├── analyticsEngine.ts  # Aggregation, chronological date bucketing, pivot matrix computation
│   │   ├── filterEngine.ts     # 3-tier filtering & multi-clause rule evaluation
│   │   ├── parser.ts           # CSV ingestion, Turkish date parser, Jira Key deduplication & upsert
│   │   └── storage.ts          # Persistent dataset storage (Electron filesystem + IndexedDB fallback)
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

import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  GitBranch,
  Table,
  Grid,
  FileText,
  Database,
  SlidersHorizontal,
  Download,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { AppView, Dataset } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  dataset: Dataset | null;
  filterDrawerOpen: boolean;
  onToggleFilterDrawer: () => void;
  activeFilterCount: number;
  onExportClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  dataset,
  filterDrawerOpen,
  onToggleFilterDrawer,
  activeFilterCount,
  onExportClick,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { t } = useLanguage();
  const isJira = dataset?.sourceType === 'jira';

  const navItems = [
    { id: 'overview', label: t.overview, icon: LayoutDashboard },
    { id: 'charts', label: t.chartStudio, icon: BarChart3 },
    ...(isJira ? [{ id: 'jira_analytics', label: t.jiraAnalytics, icon: GitBranch }] : []),
    ...(isJira ? [{ id: 'audit_report', label: t.auditReport, icon: ClipboardCheck }] : []),
    { id: 'grid', label: t.dataGrid, icon: Table },
    { id: 'pivot', label: t.pivotMatrix, icon: Grid },
    { id: 'composer', label: t.reportComposer, icon: FileText },
    { id: 'schema', label: t.schemaTypes, icon: Database },
  ] as const;

  return (
    <aside
      className={`${
        isCollapsed ? 'w-14' : 'w-56'
      } bg-[#090b0f] border-r border-white/[0.06] flex flex-col justify-between select-none transition-all duration-200 flex-shrink-0`}
    >
      {/* Navigation Section */}
      <div className="py-3 px-2 space-y-1">
        <div
          className={`flex items-center ${
            isCollapsed ? 'justify-center pb-2' : 'justify-between px-2 pb-2'
          }`}
        >
          {!isCollapsed && (
            <span className="text-2xs font-mono uppercase tracking-widest text-slate-400">
              {t.navigation}
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-white/[0.05] rounded transition-colors"
            title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as AppView)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2 py-2.5' : 'space-x-2.5 px-3 py-2'
              } rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Tooling Section */}
      <div className="p-2 border-t border-white/[0.06] space-y-1.5">
        {!isCollapsed && (
          <div className="px-2 pb-1 text-2xs font-mono uppercase tracking-widest text-slate-400 truncate">
            {t.filterQuery} & {t.exportCenter}
          </div>
        )}

        <button
          onClick={onToggleFilterDrawer}
          title={isCollapsed ? `${t.filterQuery}${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}` : undefined}
          className={`w-full relative flex items-center ${
            isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
          } rounded-md text-xs font-medium border transition-colors ${
            filterDrawerOpen || activeFilterCount > 0
              ? 'bg-cyan-950/20 border-cyan-500/30 text-cyan-300'
              : 'border-white/[0.06] text-slate-300 hover:bg-white/[0.04]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            {!isCollapsed && <span>{t.filterQuery}</span>}
          </div>
          {!isCollapsed && activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-2xs font-mono bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
              {activeFilterCount}
            </span>
          )}
          {isCollapsed && activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center text-[9px] font-mono bg-cyan-500 text-black font-bold rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={onExportClick}
          disabled={!dataset}
          title={isCollapsed ? t.exportCenter : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center px-2 py-2' : 'space-x-2 px-3 py-2'
          } rounded-md text-xs font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-colors disabled:opacity-40`}
        >
          <Download className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {!isCollapsed && <span>{t.exportCenter}</span>}
        </button>
      </div>
    </aside>
  );
};

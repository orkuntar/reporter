import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Treemap,
} from 'recharts';
import { ChartConfig, ColumnMeta, DataRow } from '../../types';
import { aggregateData } from '../../core/analyticsEngine';
import { useTheme } from '../../theme/ThemeContext';

interface ChartRendererProps {
  config: ChartConfig;
  rows: DataRow[];
  columnMetaMap: Map<string, ColumnMeta>;
  height?: number | string;
}

const DARK_PALETTES = {
  technical: ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'],
  monochrome: ['#f8fafc', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b'],
  cyber: ['#22d3ee', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fde047'],
  emerald: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46'],
  warm: ['#f59e0b', '#fb923c', '#f87171', '#fbbf24', '#ea580c', '#b45309'],
};

const LIGHT_PALETTES = {
  technical: ['#0891b2', '#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#4f46e5', '#0d9488'],
  monochrome: ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'],
  cyber: ['#0891b2', '#4f46e5', '#9333ea', '#db2777', '#059669', '#ca8a04'],
  emerald: ['#059669', '#10b981', '#047857', '#0d9488', '#065f46', '#34d399'],
  warm: ['#d97706', '#ea580c', '#dc2626', '#ca8a04', '#b45309', '#9a3412'],
};

// Custom Minimalist Tooltip (Theme-Aware)
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0e1219]/95 border border-white/[0.12] px-3 py-2 rounded shadow-2xl backdrop-blur-md text-xs font-mono">
        <p className="text-slate-300 font-semibold mb-1 border-b border-white/[0.08] pb-1">
          {label !== undefined ? label : payload[0]?.name}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between space-x-3 text-2xs py-0.5">
            <span className="flex items-center space-x-1.5" style={{ color: entry.color || '#0891b2' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || '#0891b2' }} />
              <span className="text-slate-400">{entry.name || 'Değer'}:</span>
            </span>
            <span className="text-white font-bold">{entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  config,
  rows,
  columnMetaMap,
  height = 360,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const data = aggregateData(rows, config, columnMetaMap);
  const palettes = isLight ? LIGHT_PALETTES : DARK_PALETTES;
  const palette = palettes[config.colorPalette || 'technical'];

  const gridStroke = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255,255,255,0.04)';
  const polarGridStroke = isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255,255,255,0.08)';
  const axisStroke = isLight ? '#94a3b8' : '#64748b';
  const tickFill = isLight ? '#475569' : '#94a3b8';
  const cellBorder = isLight ? '#ffffff' : '#0a0c10';
  const legendColor = isLight ? '#475569' : '#94a3b8';
  const activeDotFill = isLight ? '#0f172a' : '#fff';

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="w-full flex items-center justify-center border border-dashed border-white/[0.08] rounded text-slate-400 font-mono text-xs px-4 text-center"
      >
        "{config.title}" için veri bulunamadı. Tarih aralığını, filtreleri veya eksen seçimini kontrol edin.
      </div>
    );
  }

  // Detect any secondary grouped keys
  const reservedKeys = new Set(['label', 'value', 'percentage', 'count', '_sortTs']);
  const secondaryKeys = config.groupByCol
    ? Array.from(
        new Set(
          data.flatMap(d => Object.keys(d).filter(k => !reservedKeys.has(k)))
        )
      )
    : [];

  const hasMultiSeries = Boolean(config.groupByCol && secondaryKeys.length > 0);

  switch (config.type) {
    case 'bar_vertical':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
                angle={-25}
                textAnchor="end"
                interval={data.length > 20 ? 'preserveStartEnd' : 0}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {hasMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor, paddingTop: '8px' }} />
                  {secondaryKeys.map((key, idx) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      fill={palette[idx % palette.length]}
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </>
              ) : (
                <Bar dataKey="value" name={config.aggregation.toUpperCase()} fill={palette[0]} radius={[2, 2, 0, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'bar_horizontal':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 25, left: 60, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                type="number"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <YAxis
                dataKey="label"
                type="category"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              {hasMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor }} />
                  {secondaryKeys.map((key, idx) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      stackId={config.stackedSeries ? 'a' : undefined}
                      fill={palette[idx % palette.length]}
                      radius={[0, 2, 2, 0]}
                    />
                  ))}
                </>
              ) : (
                <Bar dataKey="value" name={config.aggregation.toUpperCase()} fill={palette[0]} radius={[0, 2, 2, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Bar>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'bar_stacked':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
                angle={-25}
                textAnchor="end"
                interval={data.length > 20 ? 'preserveStartEnd' : 0}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor, paddingTop: '10px' }}
              />
              {hasMultiSeries ? (
                secondaryKeys.map((key, idx) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    stackId="a"
                    fill={palette[idx % palette.length]}
                  />
                ))
              ) : (
                <Bar dataKey="value" name={config.aggregation.toUpperCase()} stackId="a" fill={palette[0]} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'line':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
                angle={-25}
                textAnchor="end"
                interval={data.length > 20 ? 'preserveStartEnd' : 0}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {hasMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor, paddingTop: '10px' }} />
                  {secondaryKeys.map((key, idx) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={key}
                      stroke={palette[idx % palette.length]}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: palette[idx % palette.length] }}
                      activeDot={{ r: 5, fill: activeDotFill }}
                    />
                  ))}
                </>
              ) : (
                <Line
                  type="monotone"
                  dataKey="value"
                  name={config.aggregation.toUpperCase()}
                  stroke={palette[0]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: palette[0] }}
                  activeDot={{ r: 5, fill: activeDotFill }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'area':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
              <defs>
                {hasMultiSeries ? (
                  secondaryKeys.map((key, idx) => {
                    const color = palette[idx % palette.length];
                    return (
                      <linearGradient key={key} id={`areaGrad-${config.id}-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={isLight ? 0.32 : 0.45} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    );
                  })
                ) : (
                  <linearGradient id={`areaGrad-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={palette[0]} stopOpacity={isLight ? 0.32 : 0.45} />
                    <stop offset="95%" stopColor={palette[0]} stopOpacity={0.02} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
                angle={-25}
                textAnchor="end"
                interval={data.length > 20 ? 'preserveStartEnd' : 0}
              />
              <YAxis
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {hasMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor, paddingTop: '10px' }} />
                  {secondaryKeys.map((key, idx) => {
                    const color = palette[idx % palette.length];
                    return (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={key}
                        stackId={config.stackedSeries ? '1' : undefined}
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill={`url(#areaGrad-${config.id}-${idx})`}
                      />
                    );
                  })}
                </>
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  name={config.aggregation.toUpperCase()}
                  stroke={palette[0]}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#areaGrad-${config.id})`}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );

    case 'donut':
      return (
        <div style={{ height, width: '100%' }} className="flex items-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={105}
                paddingAngle={3}
                dataKey="value"
                nameKey="label"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={palette[index % palette.length]}
                    stroke={cellBorder}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );

    case 'radar':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
              <PolarGrid stroke={polarGridStroke} />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <PolarRadiusAxis
                angle={30}
                stroke={axisStroke}
                tick={{ fill: axisStroke, fontSize: 9, fontFamily: 'Montserrat, sans-serif' }}
              />
              <Tooltip content={<CustomTooltip />} />
              {hasMultiSeries ? (
                <>
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Montserrat, sans-serif', color: legendColor }} />
                  {secondaryKeys.map((key, idx) => (
                    <Radar
                      key={key}
                      name={key}
                      dataKey={key}
                      stroke={palette[idx % palette.length]}
                      fill={palette[idx % palette.length]}
                      fillOpacity={0.25}
                    />
                  ))}
                </>
              ) : (
                <Radar
                  name={config.aggregation.toUpperCase()}
                  dataKey="value"
                  stroke={palette[0]}
                  fill={palette[0]}
                  fillOpacity={0.35}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'scatter': {
      const scatterPoints = rows.slice(0, 150).map((r, i) => {
        return {
          x: i + 1,
          y: config.yAxisCol ? r[config.yAxisCol] || 0 : 1,
          name: String(r[config.xAxisCol] || `Item ${i + 1}`),
        };
      });

      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                type="number"
                dataKey="x"
                name="Index"
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={config.yAxisCol || 'Value'}
                stroke={axisStroke}
                tick={{ fill: tickFill, fontSize: 10, fontFamily: 'Montserrat, sans-serif' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter name="Kayıtlar" data={scatterPoints} fill={palette[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      );
    }

    case 'treemap':
      return (
        <div style={{ height, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={data.map((d, i) => ({
                name: d.label,
                size: d.value,
                fill: palette[i % palette.length],
              }))}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke={cellBorder}
              fill={palette[0]}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      );

    default:
      return null;
  }
};

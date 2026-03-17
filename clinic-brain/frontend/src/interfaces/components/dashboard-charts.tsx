/**
 * Componentes de gráficos para o dashboard.
 * Usa Recharts para visualização dos dados nos modais.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import type { DashboardOverview } from '../../application/services/clinic-api'

export type ChartViewType =
  | 'table'
  | 'bar'
  | 'column'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'radar'

export const CHART_VIEW_LABELS: Record<ChartViewType, string> = {
  table: 'Tabela',
  bar: 'Barras',
  column: 'Colunas',
  line: 'Linha',
  area: 'Área',
  pie: 'Pizza',
  donut: 'Donut',
  radar: 'Radar',
}

/** Tipos compatíveis com dados de ranking (lista nome + valor) */
export const RANKING_CHART_TYPES: ChartViewType[] = ['table', 'bar', 'column', 'line', 'area']

/** Tipos compatíveis com dados proporcionais (categorias + contagens) */
export const PROPORTION_CHART_TYPES: ChartViewType[] = ['table', 'pie', 'donut', 'bar', 'column', 'line', 'area', 'radar']

export const DEFAULT_ENABLED_CHART_TYPES: string[] = [
  'table',
  'bar',
  'column',
  'line',
  'area',
  'pie',
  'donut',
  'radar',
]

const CHART_COLORS = ['#2563eb', '#64748b', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

function filterAvailableViews(
  supported: ChartViewType[],
  enabled: string[] | undefined,
): ChartViewType[] {
  const set = new Set(enabled ?? DEFAULT_ENABLED_CHART_TYPES)
  return supported.filter((v) => set.has(v))
}

export function getRankingAvailableViews(enabledChartTypes?: string[]): ChartViewType[] {
  return filterAvailableViews(RANKING_CHART_TYPES, enabledChartTypes)
}

export function getProportionAvailableViews(enabledChartTypes?: string[]): ChartViewType[] {
  return filterAvailableViews(PROPORTION_CHART_TYPES, enabledChartTypes)
}

export function ChartToggle({
  view,
  onViewChange,
  availableViews,
}: {
  view: ChartViewType
  onViewChange: (v: ChartViewType) => void
  availableViews: ChartViewType[]
}) {
  return (
    <div className="chart-view-toggle" role="group" aria-label="Tipo de visualização">
      {availableViews.map((v) => (
        <button
          key={v}
          type="button"
          className={view === v ? 'active' : ''}
          onClick={() => onViewChange(v)}
        >
          {CHART_VIEW_LABELS[v]}
        </button>
      ))}
    </div>
  )
}

const tooltipStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 8,
} as const

type RankingVariant = 'bar' | 'column' | 'line' | 'area'

function formatTooltipValue(value: unknown): number {
  return Number(value ?? 0)
}

function RankingChartWrapper({
  data,
  valueKey,
  valueLabel,
  color,
  variant,
}: {
  data: Array<{ name: string; [k: string]: unknown }>
  valueKey: string
  valueLabel: string
  color: string
  variant: RankingVariant
}) {
  const margin = variant === 'bar' ? { left: 20, right: 20 } : { bottom: 20, left: 10, right: 10 }
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
      <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [formatTooltipValue(v), valueLabel]} />
    </>
  )
  if (variant === 'bar') {
    return (
      <BarChart data={data} layout="vertical" margin={margin}>
        {common}
        <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
        <YAxis type="category" dataKey="name" width={100} stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
        <Bar dataKey={valueKey} fill={color} radius={[0, 4, 4, 0]} />
      </BarChart>
    )
  }
  if (variant === 'column') {
    return (
      <BarChart data={data} margin={margin}>
        {common}
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
        <YAxis stroke="var(--text-muted)" fontSize={12} />
        <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    )
  }
  // column = vertical bars (X=name, Y=value)
  if (variant === 'line' || variant === 'area') {
    const Chart = variant === 'line' ? LineChart : AreaChart
    const DataShape = variant === 'line' ? Line : Area
    return (
      <Chart data={data} margin={margin}>
        {common}
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
        <YAxis stroke="var(--text-muted)" fontSize={12} />
        <DataShape type="monotone" dataKey={valueKey} stroke={color} fill={variant === 'area' ? color : undefined} fillOpacity={variant === 'area' ? 0.4 : undefined} />
      </Chart>
    )
  }
  // Default: column (vertical bars)
  return (
    <BarChart data={data} margin={margin}>
      {common}
      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={60} />
      <YAxis stroke="var(--text-muted)" fontSize={12} />
      <Bar dataKey={valueKey} fill={color} radius={[4, 4, 0, 0]} />
    </BarChart>
  )
}

export function PatientsInactiveChart({
  data,
  variant = 'bar',
}: {
  data: NonNullable<DashboardOverview['patientsInactive']>
  variant?: RankingVariant
}) {
  const chartData = data
    .slice(0, 15)
    .map((p) => ({
      name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
      dias: p.daysSinceLastConsultation ?? 0,
    }))
  if (chartData.length === 0) return null
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <RankingChartWrapper data={chartData} valueKey="dias" valueLabel="Dias sem consultar" color="#2563eb" variant={variant} />
      </ResponsiveContainer>
    </div>
  )
}

export function PatientsTopConsultationsChart({
  data,
  variant = 'bar',
}: {
  data: NonNullable<DashboardOverview['patientsTopConsultations']>
  variant?: 'bar' | 'column' | 'line' | 'area'
}) {
  const chartData = data.slice(0, 15).map((p) => ({
    name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
    consultas: p.consultationCount,
  }))
  if (chartData.length === 0) return null
  const tooltipStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 8,
  }
  const formatter = (value: unknown) => [Number(value ?? 0), 'Consultas']
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        {variant === 'bar' && (
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
            <YAxis type="category" dataKey="name" width={100} stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
            <Bar dataKey="consultas" fill="#22c55e" radius={[0, 4, 4, 0]} />
          </BarChart>
        )}
        {variant === 'column' && (
          <BarChart data={chartData} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
            <Bar dataKey="consultas" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
        {variant === 'line' && (
          <LineChart data={chartData} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
            <Line type="monotone" dataKey="consultas" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
          </LineChart>
        )}
        {variant === 'area' && (
          <AreaChart data={chartData} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
            <Area type="monotone" dataKey="consultas" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export type ProportionVariant = 'pie' | 'donut' | 'radar' | 'bar' | 'column' | 'line' | 'area'

function ProportionChart({
  chartData,
  total,
  variant,
  tooltipFormatter,
}: {
  chartData: Array<{ name: string; value: number; color: string }>
  total: number
  variant: ProportionVariant
  tooltipFormatter: (value: number, name: string) => string
}) {
  if (chartData.length === 0) return null
  const tooltip = (v: unknown, n?: unknown) => [tooltipFormatter(formatTooltipValue(v), String(n ?? '')), String(n ?? '')] as [string, string]

  if (variant === 'pie' || variant === 'donut') {
    return (
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={variant === 'donut' ? 60 : 0}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8 }} formatter={(v, n) => tooltip(v, n)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (variant === 'radar') {
    const radarData = chartData.map((d) => ({ subject: d.name, value: d.value, fullMark: Math.max(total, 1) }))
    return (
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--card-border)" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <PolarRadiusAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <Radar name="Quantidade" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.4} />
            <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8 }} formatter={(v, n) => tooltip(v, n)} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (variant === 'line') {
    return (
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8 }} formatter={(v, n) => tooltip(v, n)} />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ fill: CHART_COLORS[0] }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (variant === 'area') {
    return (
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fontSize: 10 }} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8 }} formatter={(v, n) => tooltip(v, n)} />
            <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.4} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )
  }

  const isBar = variant === 'bar'
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={chartData} layout={isBar ? 'vertical' : undefined} margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
          {isBar ? (
            <>
              <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
              <YAxis type="category" dataKey="name" width={80} stroke="var(--text-muted)" fontSize={11} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={12} />
            </>
          )}
          <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 8 }} formatter={(v, n) => tooltip(v, n)} />
          <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function InteractionsPieChart({
  data,
  variant = 'donut',
}: {
  data: NonNullable<DashboardOverview['interactionsSummary']>
  variant?: ProportionVariant
}) {
  const chartData = [
    { name: 'Bot', value: data.byType.BOT, color: CHART_COLORS[0] },
    { name: 'Humano', value: data.byType.HUMANO, color: CHART_COLORS[1] },
    { name: 'Paciente', value: data.byType.PACIENTE, color: CHART_COLORS[2] },
  ].filter((d) => d.value > 0)
  return (
    <ProportionChart
      chartData={chartData}
      total={data.total}
      variant={variant}
      tooltipFormatter={(v) => `${v} (${data.total > 0 ? Math.round((v / data.total) * 100) : 0}%)`}
    />
  )
}

export function AppointmentsByModePieChart({
  data,
  variant = 'donut',
}: {
  data: NonNullable<DashboardOverview['appointmentsByMode']>
  variant?: ProportionVariant
}) {
  const chartData = [
    { name: 'Presencial', value: data.byMode.PRESENCIAL, color: CHART_COLORS[0] },
    { name: 'Remoto', value: data.byMode.REMOTO, color: CHART_COLORS[1] },
  ].filter((d) => d.value > 0)
  if (chartData.length === 0) return null
  return (
    <ProportionChart
      chartData={chartData}
      total={data.total}
      variant={variant}
      tooltipFormatter={(v) => `${v} (${data.total > 0 ? Math.round((v / data.total) * 100) : 0}%)`}
    />
  )
}

export function AgendaOccupancyPieChart({
  data,
  variant = 'donut',
}: {
  data: NonNullable<DashboardOverview['agendaOccupancy']>
  variant?: ProportionVariant
}) {
  const realizado = data.realizedAppointments
  const naoRealizado = Math.max(0, data.totalAppointments - realizado)
  const chartData = [
    { name: 'Realizadas', value: realizado, color: CHART_COLORS[2] },
    { name: 'Não realizadas', value: naoRealizado, color: CHART_COLORS[1] },
  ].filter((d) => d.value > 0)
  if (chartData.length === 0) return null
  return (
    <ProportionChart
      chartData={chartData}
      total={data.totalAppointments}
      variant={variant}
      tooltipFormatter={(v) => `${v} (${data.totalAppointments > 0 ? Math.round((v / data.totalAppointments) * 100) : 0}%)`}
    />
  )
}

export function ReactivationPieChart({
  data,
  variant = 'donut',
}: {
  data: NonNullable<DashboardOverview['reactivationRate']>
  variant?: ProportionVariant
}) {
  const retornaram = data.totalReturned
  const naoRetornaram = Math.max(0, data.totalInactive - retornaram)
  const chartData = [
    { name: 'Retornaram', value: retornaram, color: CHART_COLORS[2] },
    { name: 'Não retornaram', value: naoRetornaram, color: CHART_COLORS[1] },
  ].filter((d) => d.value > 0)
  if (chartData.length === 0) return null
  return (
    <ProportionChart
      chartData={chartData}
      total={data.totalInactive}
      variant={variant}
      tooltipFormatter={(v) => `${v} (${data.totalInactive > 0 ? Math.round((v / data.totalInactive) * 100) : 0}%)`}
    />
  )
}

export function ReschedulePieChart({
  data,
  variant = 'donut',
}: {
  data: NonNullable<DashboardOverview['rescheduleRate']>
  variant?: ProportionVariant
}) {
  const remarcados = data.rescheduledCount
  const normais = Math.max(0, data.totalAppointments - remarcados)
  const chartData = [
    { name: 'Remarcações', value: remarcados, color: CHART_COLORS[3] },
    { name: 'Agendamentos originais', value: normais, color: CHART_COLORS[1] },
  ].filter((d) => d.value > 0)
  if (chartData.length === 0) return null
  return (
    <ProportionChart
      chartData={chartData}
      total={data.totalAppointments}
      variant={variant}
      tooltipFormatter={(v) => `${v} (${data.totalAppointments > 0 ? Math.round((v / data.totalAppointments) * 100) : 0}%)`}
    />
  )
}

export function LoyaltyPieChart({
  data,
  variant = 'donut',
}: {
  data: NonNullable<DashboardOverview['loyaltyRate']>
  variant?: ProportionVariant
}) {
  const fieis = data.loyalPatientsCount
  const naoFieis = Math.max(0, data.totalConsultations - data.loyalPatientsCount)
  const chartData = [
    { name: 'Pacientes com 2+ consultas', value: fieis, color: CHART_COLORS[2] },
    { name: 'Consulta única', value: naoFieis, color: CHART_COLORS[1] },
  ].filter((d) => d.value > 0)
  if (chartData.length === 0) return null
  return (
    <ProportionChart
      chartData={chartData}
      total={data.totalConsultations}
      variant={variant}
      tooltipFormatter={(v) => `${v} (${data.totalConsultations > 0 ? Math.round((v / data.totalConsultations) * 100) : 0}%)`}
    />
  )
}


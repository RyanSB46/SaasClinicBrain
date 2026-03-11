import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  fetchMonthlyReport,
  fetchPatientsInactive,
  fetchPatientsTopConsultations,
  fetchPatientsCancellations,
  fetchPatientsReschedules,
  fetchPatientsNew,
  fetchReactivationRate,
  fetchLoyaltyRate,
  fetchRescheduleRate,
  fetchAppointmentsBySchedule,
  fetchInteractionsReport,
  fetchPatientsTopInteractions,
  fetchAgendaOccupancy,
  fetchAppointmentsByMode,
  fetchAverageConsultationDuration,
  type ReportFiltersParams,
} from '../../application/services/clinic-api'
import { ErrorState, LoadingState } from '../components/feedback-states'

function formatDateInput(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatMoney(cents: number): string {
  const value = cents / 100
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function formatDateTime(value: string): string {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function statusLabel(status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'): string {
  switch (status) {
    case 'AGENDADO':
      return 'Agendado'
    case 'CONFIRMADO':
      return 'Confirmado'
    case 'CANCELADO':
      return 'Cancelado'
    case 'FALTOU':
      return 'Faltou'
    case 'REMARCADO':
      return 'Remarcado'
    default:
      return status
  }
}

function ReportsAnalyticsSection({ params }: { params: ReportFiltersParams }) {
  const inactive = useQuery({
    queryKey: ['report-inactive', params],
    queryFn: () => fetchPatientsInactive(params),
    enabled: params.from != null && params.to != null,
  })
  const topConsultations = useQuery({
    queryKey: ['report-top-consultations', params],
    queryFn: () => fetchPatientsTopConsultations(params),
    enabled: params.from != null && params.to != null,
  })
  const cancellations = useQuery({
    queryKey: ['report-cancellations', params],
    queryFn: () => fetchPatientsCancellations(params),
    enabled: params.from != null && params.to != null,
  })
  const reschedules = useQuery({
    queryKey: ['report-reschedules', params],
    queryFn: () => fetchPatientsReschedules(params),
    enabled: params.from != null && params.to != null,
  })
  const newPatients = useQuery({
    queryKey: ['report-new', params],
    queryFn: () => fetchPatientsNew(params),
    enabled: params.from != null && params.to != null,
  })
  const reactivation = useQuery({
    queryKey: ['report-reactivation', params],
    queryFn: () => fetchReactivationRate(params),
    enabled: params.from != null && params.to != null,
  })
  const loyalty = useQuery({
    queryKey: ['report-loyalty', params],
    queryFn: () => fetchLoyaltyRate(params),
    enabled: params.from != null && params.to != null,
  })
  const rescheduleRate = useQuery({
    queryKey: ['report-reschedule-rate', params],
    queryFn: () => fetchRescheduleRate(params),
    enabled: params.from != null && params.to != null,
  })
  const bySchedule = useQuery({
    queryKey: ['report-by-schedule', params],
    queryFn: () => fetchAppointmentsBySchedule(params),
    enabled: params.from != null && params.to != null,
  })
  const interactions = useQuery({
    queryKey: ['report-interactions', params],
    queryFn: () => fetchInteractionsReport(params),
    enabled: params.from != null && params.to != null,
  })
  const topInteractions = useQuery({
    queryKey: ['report-top-interactions', params],
    queryFn: () => fetchPatientsTopInteractions(params),
    enabled: params.from != null && params.to != null,
  })
  const occupancy = useQuery({
    queryKey: ['report-occupancy', params],
    queryFn: () => fetchAgendaOccupancy(params),
    enabled: params.from != null && params.to != null,
  })
  const byMode = useQuery({
    queryKey: ['report-by-mode', params],
    queryFn: () => fetchAppointmentsByMode(params),
    enabled: params.from != null && params.to != null,
  })
  const avgDuration = useQuery({
    queryKey: ['report-avg-duration', params],
    queryFn: () => fetchAverageConsultationDuration(params),
    enabled: params.from != null && params.to != null,
  })

  const isLoading =
    inactive.isLoading ||
    topConsultations.isLoading ||
    cancellations.isLoading ||
    reschedules.isLoading ||
    newPatients.isLoading ||
    reactivation.isLoading ||
    loyalty.isLoading ||
    rescheduleRate.isLoading ||
    bySchedule.isLoading ||
    interactions.isLoading ||
    topInteractions.isLoading ||
    occupancy.isLoading ||
    byMode.isLoading ||
    avgDuration.isLoading

  if (isLoading) {
    return <LoadingState message="Carregando relatórios analíticos..." />
  }

  return (
    <>
      <div className="metrics-grid stagger-children">
        {reactivation.data && (
          <article className="card metric-card">
            <h3>Taxa de reativação</h3>
            <strong>{reactivation.data.reactivationRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.85em' }}>
              {reactivation.data.totalReturned} de {reactivation.data.totalInactive} retornaram
            </p>
          </article>
        )}
        {loyalty.data && (
          <article className="card metric-card">
            <h3>Taxa de fidelidade</h3>
            <strong>{loyalty.data.loyaltyRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.85em' }}>
              {loyalty.data.loyalPatientsCount} com 2+ consultas
            </p>
          </article>
        )}
        {rescheduleRate.data && (
          <article className="card metric-card">
            <h3>Taxa de remarcação</h3>
            <strong>{rescheduleRate.data.rescheduleRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.85em' }}>
              {rescheduleRate.data.rescheduledCount} remarcações
            </p>
          </article>
        )}
        {occupancy.data && (
          <article className="card metric-card">
            <h3>Ocupação da agenda</h3>
            <strong>{occupancy.data.occupancyRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.85em' }}>
              {occupancy.data.realizedAppointments}/{occupancy.data.totalAppointments}
            </p>
          </article>
        )}
        {byMode.data && (
          <article className="card metric-card">
            <h3>Por modo</h3>
            <strong>{byMode.data.total} total</strong>
            <p className="muted-text" style={{ fontSize: '0.85em' }}>
              Presencial: {byMode.data.byMode.PRESENCIAL} · Remoto: {byMode.data.byMode.REMOTO}
            </p>
          </article>
        )}
        {avgDuration.data && (
          <article className="card metric-card">
            <h3>Duração média</h3>
            <strong>{avgDuration.data.averageMinutes} min</strong>
            <p className="muted-text" style={{ fontSize: '0.85em' }}>
              {avgDuration.data.appointmentCount} consultas
            </p>
          </article>
        )}
      </div>

      {inactive.data?.patients && inactive.data.patients.length > 0 && (
        <article className="card">
          <h3>Pacientes inativos ({params.inactivityMonths ?? 2}+ meses)</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Última consulta</th>
                  <th>Dias sem consultar</th>
                </tr>
              </thead>
              <tbody>
                {inactive.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{p.lastConsultationAt ? new Date(p.lastConsultationAt).toLocaleDateString('pt-BR') : 'Nunca'}</td>
                    <td>{p.daysSinceLastConsultation ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {topConsultations.data?.patients && topConsultations.data.patients.length > 0 && (
        <article className="card">
          <h3>Top consultas no período</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Consultas</th>
                </tr>
              </thead>
              <tbody>
                {topConsultations.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{p.consultationCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {cancellations.data?.patients && cancellations.data.patients.length > 0 && (
        <article className="card">
          <h3>Pacientes que cancelaram</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Cancelamentos</th>
                </tr>
              </thead>
              <tbody>
                {cancellations.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{p.cancellationCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {reschedules.data?.patients && reschedules.data.patients.length > 0 && (
        <article className="card">
          <h3>Pacientes que remarcaram</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Remarcações</th>
                </tr>
              </thead>
              <tbody>
                {reschedules.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{p.rescheduleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {newPatients.data?.patients && newPatients.data.patients.length > 0 && (
        <article className="card">
          <h3>Novos pacientes</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Cadastrado em</th>
                </tr>
              </thead>
              <tbody>
                {newPatients.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {interactions.data && (
        <article className="card">
          <h3>Interações WhatsApp</h3>
          <p className="muted-text">
            Bot: {interactions.data.byType.BOT} · Humano: {interactions.data.byType.HUMANO} · Paciente: {interactions.data.byType.PACIENTE} · Total: {interactions.data.total}
          </p>
        </article>
      )}

      {topInteractions.data?.patients && topInteractions.data.patients.length > 0 && (
        <article className="card">
          <h3>Pacientes que mais interagem</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Telefone</th>
                  <th>Interações</th>
                </tr>
              </thead>
              <tbody>
                {topInteractions.data.patients.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{p.interactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {bySchedule.data?.slots && bySchedule.data.slots.length > 0 && (
        <article className="card">
          <h3>Horários mais frequentes</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Hora</th>
                  <th>Consultas</th>
                </tr>
              </thead>
              <tbody>
                {bySchedule.data.slots.slice(0, 20).map((s, i) => (
                  <tr key={i}>
                    <td>{s.weekdayLabel}</td>
                    <td>{s.hourLabel}</td>
                    <td>{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </>
  )
}

function toExportRows(
  appointments: Array<{
    startsAt: string
    endsAt: string
    status: 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'
    notes?: string | null
    patient: {
      name: string
      phoneNumber: string
    }
  }>,
) {
  return appointments.map((appointment) => ({
    Paciente: appointment.patient.name,
    Telefone: appointment.patient.phoneNumber,
    Inicio: formatDateTime(appointment.startsAt),
    Fim: formatDateTime(appointment.endsAt),
    Status: statusLabel(appointment.status),
    Observacoes: appointment.notes?.trim() ? appointment.notes.trim() : '-',
  }))
}

type DetailFilter = 'ALL' | 'AGENDADO' | 'CONFIRMADO' | 'CANCELADO' | 'FALTOU' | 'REMARCADO'
type ReportTab = 'monthly' | 'analytics'

export function ReportsPage() {
  const now = new Date()
  const [activeTab, setActiveTab] = useState<ReportTab>('monthly')
  const [from, setFrom] = useState(formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)))
  const [to, setTo] = useState(formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 1)))
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('ALL')
  const [inactivityMonths, setInactivityMonths] = useState(2)

  const enabled = useMemo(() => from.length > 0 && to.length > 0, [from, to])

  const reportParams: ReportFiltersParams = useMemo(
    () => ({ from, to, inactivityMonths }),
    [from, to, inactivityMonths],
  )

  const reportQuery = useQuery({
    queryKey: ['monthly-report', from, to],
    queryFn: () => fetchMonthlyReport(new Date(from).toISOString(), new Date(to).toISOString()),
    enabled,
  })

  const filteredAppointments = useMemo(() => {
    if (!reportQuery.data) {
      return []
    }

    if (detailFilter === 'ALL') {
      return reportQuery.data.detailedAppointments
    }

    return reportQuery.data.detailedAppointments.filter((appointment) => appointment.status === detailFilter)
  }, [detailFilter, reportQuery.data])

  const fileTag = useMemo(() => `${from}_${to}`, [from, to])

  function exportCsv() {
    if (!reportQuery.data) {
      return
    }

    const rows = toExportRows(filteredAppointments)
    const headers = ['Paciente', 'Telefone', 'Inicio', 'Fim', 'Status', 'Observacoes']
    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        [row.Paciente, row.Telefone, row.Inicio, row.Fim, row.Status, row.Observacoes]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(';'),
      ),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-detalhado-${fileTag}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportExcel() {
    if (!reportQuery.data) {
      return
    }

    const rows = toExportRows(filteredAppointments)
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatorio')
    XLSX.writeFile(workbook, `relatorio-detalhado-${fileTag}.xlsx`)
  }

  function exportPdf() {
    if (!reportQuery.data) {
      return
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    })

    doc.setFontSize(14)
    doc.text('Relatório detalhado de consultas', 40, 36)
    doc.setFontSize(10)
    doc.text(`Período: ${from} até ${to}`, 40, 54)
    doc.text(`Filtro aplicado: ${detailFilter === 'ALL' ? 'Todos os status' : statusLabel(detailFilter)}`, 40, 68)

    autoTable(doc, {
      startY: 80,
      head: [['Paciente', 'Telefone', 'Início', 'Fim', 'Status', 'Observações']],
      body: filteredAppointments.map((appointment) => [
        appointment.patient.name,
        appointment.patient.phoneNumber,
        formatDateTime(appointment.startsAt),
        formatDateTime(appointment.endsAt),
        statusLabel(appointment.status),
        appointment.notes?.trim() ? appointment.notes.trim() : '-',
      ]),
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [37, 99, 235],
      },
    })

    doc.save(`relatorio-detalhado-${fileTag}.pdf`)
  }

  return (
    <section className="reports-grid">
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className={`secondary-button ${activeTab === 'monthly' ? 'detail-filter-button-active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          Relatório mensal
        </button>
        <button
          type="button"
          className={`secondary-button ${activeTab === 'analytics' ? 'detail-filter-button-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Relatórios analíticos
        </button>
      </div>

      <article className="card">
        <h3>Filtros do relatório</h3>
        <p className="muted-text">Selecione o período para gerar os indicadores.</p>

        <div className="filter-grid">
          <label className="field-label" htmlFor="report-from">De</label>
          <input
            id="report-from"
            className="field-input"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <label className="field-label" htmlFor="report-to">Até</label>
          <input
            id="report-to"
            className="field-input"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          {activeTab === 'analytics' && (
            <>
              <label className="field-label" htmlFor="report-inactivity">Inatividade (meses)</label>
              <select
                id="report-inactivity"
                className="field-input"
                value={inactivityMonths}
                onChange={(e) => setInactivityMonths(Number(e.target.value))}
              >
                {[1, 2, 3, 5, 6, 12].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </article>

      {activeTab === 'monthly' && reportQuery.isLoading && <LoadingState message="Gerando relatório mensal..." />}

      {activeTab === 'monthly' && reportQuery.isError && (
        <ErrorState
          message={reportQuery.error.message}
          onRetry={() => void reportQuery.refetch()}
        />
      )}

      {activeTab === 'analytics' && (
        <ReportsAnalyticsSection params={reportParams} />
      )}

      {activeTab === 'monthly' && reportQuery.data && (
        <>
          <div className="metrics-grid stagger-children">
            <article className="card metric-card metric-card-clickable" onClick={() => setDetailFilter('ALL')}>
              <h3>Total de consultas</h3>
              <strong>{reportQuery.data.totalConsultations}</strong>
            </article>
            <article className="card metric-card metric-card-clickable" onClick={() => setDetailFilter('CONFIRMADO')}>
              <h3>Confirmadas</h3>
              <strong>{reportQuery.data.confirmed}</strong>
            </article>
            <article className="card metric-card metric-card-clickable" onClick={() => setDetailFilter('CANCELADO')}>
              <h3>Canceladas</h3>
              <strong>{reportQuery.data.canceled}</strong>
            </article>
            <article className="card metric-card metric-card-clickable" onClick={() => setDetailFilter('FALTOU')}>
              <h3>Faltas</h3>
              <strong>{reportQuery.data.missed}</strong>
            </article>
            <article className="card metric-card metric-card-clickable" onClick={() => setDetailFilter('CONFIRMADO')}>
              <h3>Taxa de comparecimento</h3>
              <strong>{reportQuery.data.attendanceRate}%</strong>
            </article>
            <article className="card metric-card metric-card-clickable" onClick={() => setDetailFilter('CONFIRMADO')}>
              <h3>Receita estimada</h3>
              <strong>{formatMoney(reportQuery.data.estimatedRevenueCents)}</strong>
            </article>
          </div>

          <article className="card">
            <h3>Detalhamento por status</h3>
            <p className="muted-text">Clique em um bloco para filtrar a lista detalhada abaixo.</p>
            <div className="summary-grid">
              <button
                type="button"
                className={`secondary-button detail-filter-button ${detailFilter === 'ALL' ? 'detail-filter-button-active' : ''}`}
                onClick={() => setDetailFilter('ALL')}
              >
                Todos ({reportQuery.data.totalConsultations})
              </button>
              <button
                type="button"
                className={`secondary-button detail-filter-button ${detailFilter === 'AGENDADO' ? 'detail-filter-button-active' : ''}`}
                onClick={() => setDetailFilter('AGENDADO')}
              >
                Agendados ({reportQuery.data.summaryByStatus.AGENDADO})
              </button>
              <button
                type="button"
                className={`secondary-button detail-filter-button ${detailFilter === 'CONFIRMADO' ? 'detail-filter-button-active' : ''}`}
                onClick={() => setDetailFilter('CONFIRMADO')}
              >
                Confirmados ({reportQuery.data.summaryByStatus.CONFIRMADO})
              </button>
              <button
                type="button"
                className={`secondary-button detail-filter-button ${detailFilter === 'CANCELADO' ? 'detail-filter-button-active' : ''}`}
                onClick={() => setDetailFilter('CANCELADO')}
              >
                Cancelados ({reportQuery.data.summaryByStatus.CANCELADO})
              </button>
              <button
                type="button"
                className={`secondary-button detail-filter-button ${detailFilter === 'FALTOU' ? 'detail-filter-button-active' : ''}`}
                onClick={() => setDetailFilter('FALTOU')}
              >
                Faltas ({reportQuery.data.summaryByStatus.FALTOU})
              </button>
              <button
                type="button"
                className={`secondary-button detail-filter-button ${detailFilter === 'REMARCADO' ? 'detail-filter-button-active' : ''}`}
                onClick={() => setDetailFilter('REMARCADO')}
              >
                Remarcados ({reportQuery.data.summaryByStatus.REMARCADO})
              </button>
            </div>
          </article>

          <article className="card">
            <h3>Pacientes no período</h3>
            <div className="summary-grid">
              <div>
                <span className="muted-text">Pacientes ativos</span>
                <p>{reportQuery.data.activePatients}</p>
              </div>
              <div>
                <span className="muted-text">Pacientes inativos</span>
                <p>{reportQuery.data.inactivePatients}</p>
              </div>
            </div>
          </article>

          <article className="card">
            <h3>Consultas detalhadas</h3>
            <p className="muted-text">Exporte o detalhamento em PDF, Excel (.xlsx) ou CSV.</p>

            <div className="report-actions-row">
              <button type="button" className="secondary-button" onClick={exportPdf}>
                Exportar PDF
              </button>
              <button type="button" className="secondary-button" onClick={exportExcel}>
                Exportar Excel
              </button>
              <button type="button" className="secondary-button" onClick={exportCsv}>
                Exportar CSV
              </button>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Telefone</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Status</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted-text">
                        Nenhuma consulta encontrada para o filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td>{appointment.patient.name}</td>
                        <td>{appointment.patient.phoneNumber}</td>
                        <td>{formatDateTime(appointment.startsAt)}</td>
                        <td>{formatDateTime(appointment.endsAt)}</td>
                        <td>{statusLabel(appointment.status)}</td>
                        <td>{appointment.notes?.trim() ? appointment.notes.trim() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  )
}

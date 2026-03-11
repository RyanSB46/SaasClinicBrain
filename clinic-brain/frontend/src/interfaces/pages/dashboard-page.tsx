import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchDashboardOverview, type DashboardOverview, type ReportFiltersParams } from '../../application/services/clinic-api'
import { ErrorState, LoadingState } from '../components/feedback-states'
import { AnimatedGrid, AnimatedGridItem, gridItemVariants } from '../components/animated-grid'

function formatDateInput(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

type DetailModalKind =
  | 'patientsInactive'
  | 'patientsTopConsultations'
  | 'patientsNew'
  | 'reactivationRate'
  | 'loyaltyRate'
  | 'rescheduleRate'
  | 'interactionsSummary'
  | 'agendaOccupancy'
  | 'appointmentsByMode'
  | 'averageConsultationMinutes'

function FilterModal({
  from,
  to,
  inactivityMonths,
  onFrom,
  onTo,
  onInactivityMonths,
  onClose,
}: {
  from: string
  to: string
  inactivityMonths: number
  onFrom: (v: string) => void
  onTo: (v: string) => void
  onInactivityMonths: (v: number) => void
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="card modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Filtros do dashboard</h3>
        <p className="muted-text">Defina o período e o critério de inatividade para as métricas.</p>
        <div className="filter-panel-grid">
          <div>
            <label className="field-label" htmlFor="modal-from">De</label>
            <input
              id="modal-from"
              className="field-input"
              type="date"
              value={from}
              onChange={(e) => onFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="modal-to">Até</label>
            <input
              id="modal-to"
              className="field-input"
              type="date"
              value={to}
              onChange={(e) => onTo(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="modal-inactivity">Pacientes inativos há (meses)</label>
            <select
              id="modal-inactivity"
              className="field-input"
              value={inactivityMonths}
              onChange={(e) => onInactivityMonths(Number(e.target.value))}
            >
              {[1, 2, 3, 5, 6, 12].map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={onClose}>
          Aplicar
        </button>
      </article>
    </div>
  )
}

function DetailModal({
  kind,
  data,
  inactivityMonths,
  onClose,
}: {
  kind: DetailModalKind
  data: DashboardOverview
  inactivityMonths: number
  onClose: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="card modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>
            {kind === 'patientsInactive' && `Pacientes sem consulta há ${inactivityMonths}+ meses`}
            {kind === 'patientsTopConsultations' && 'Top consultas no período'}
            {kind === 'patientsNew' && 'Novos pacientes no período'}
            {kind === 'reactivationRate' && 'Taxa de reativação'}
            {kind === 'loyaltyRate' && 'Taxa de fidelidade'}
            {kind === 'rescheduleRate' && 'Taxa de remarcação'}
            {kind === 'interactionsSummary' && 'Interações WhatsApp'}
            {kind === 'agendaOccupancy' && 'Ocupação da agenda'}
            {kind === 'appointmentsByMode' && 'Consultas por modo'}
            {kind === 'averageConsultationMinutes' && 'Duração média de consultas'}
          </h3>
          <button type="button" className="secondary-button" onClick={onClose}>
            Fechar
          </button>
        </div>

        {kind === 'patientsInactive' && data.patientsInactive && data.patientsInactive.length > 0 && (
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
                {data.patientsInactive.map((p) => (
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
        )}

        {kind === 'patientsTopConsultations' && data.patientsTopConsultations && data.patientsTopConsultations.length > 0 && (
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
                {data.patientsTopConsultations.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{p.consultationCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {kind === 'patientsNew' && data.patientsNew && data.patientsNew.length > 0 && (
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
                {data.patientsNew.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.phoneNumber}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {kind === 'reactivationRate' && data.reactivationRate && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Total inativos:</strong> {data.reactivationRate.totalInactive}</p>
            <p><strong>Retornaram no período:</strong> {data.reactivationRate.totalReturned}</p>
            <p><strong>Taxa:</strong> {data.reactivationRate.reactivationRatePercent}%</p>
            <p className="muted-text">Período: {new Date(data.reactivationRate.period.from).toLocaleDateString('pt-BR')} a {new Date(data.reactivationRate.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        {kind === 'loyaltyRate' && data.loyaltyRate && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Total de consultas:</strong> {data.loyaltyRate.totalConsultations}</p>
            <p><strong>Pacientes com 2+ consultas:</strong> {data.loyaltyRate.loyalPatientsCount}</p>
            <p><strong>Taxa de fidelidade:</strong> {data.loyaltyRate.loyaltyRatePercent}%</p>
            <p className="muted-text">Período: {new Date(data.loyaltyRate.period.from).toLocaleDateString('pt-BR')} a {new Date(data.loyaltyRate.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        {kind === 'rescheduleRate' && data.rescheduleRate && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Total de agendamentos:</strong> {data.rescheduleRate.totalAppointments}</p>
            <p><strong>Remarcações:</strong> {data.rescheduleRate.rescheduledCount}</p>
            <p><strong>Taxa:</strong> {data.rescheduleRate.rescheduleRatePercent}%</p>
            <p className="muted-text">Período: {new Date(data.rescheduleRate.period.from).toLocaleDateString('pt-BR')} a {new Date(data.rescheduleRate.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        {kind === 'interactionsSummary' && data.interactionsSummary && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Bot:</strong> {data.interactionsSummary.byType.BOT}</p>
            <p><strong>Humano:</strong> {data.interactionsSummary.byType.HUMANO}</p>
            <p><strong>Paciente:</strong> {data.interactionsSummary.byType.PACIENTE}</p>
            <p><strong>Total:</strong> {data.interactionsSummary.total}</p>
            <p className="muted-text">Período: {new Date(data.interactionsSummary.period.from).toLocaleDateString('pt-BR')} a {new Date(data.interactionsSummary.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        {kind === 'agendaOccupancy' && data.agendaOccupancy && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Consultas realizadas:</strong> {data.agendaOccupancy.realizedAppointments}</p>
            <p><strong>Total agendado:</strong> {data.agendaOccupancy.totalAppointments}</p>
            <p><strong>Taxa de ocupação:</strong> {data.agendaOccupancy.occupancyRatePercent}%</p>
            <p className="muted-text">Período: {new Date(data.agendaOccupancy.period.from).toLocaleDateString('pt-BR')} a {new Date(data.agendaOccupancy.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        {kind === 'appointmentsByMode' && data.appointmentsByMode && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Presencial:</strong> {data.appointmentsByMode.byMode.PRESENCIAL}</p>
            <p><strong>Remoto:</strong> {data.appointmentsByMode.byMode.REMOTO}</p>
            <p><strong>Total:</strong> {data.appointmentsByMode.total}</p>
            <p className="muted-text">Período: {new Date(data.appointmentsByMode.period.from).toLocaleDateString('pt-BR')} a {new Date(data.appointmentsByMode.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}

        {kind === 'averageConsultationMinutes' && data.averageConsultationMinutes && (
          <div className="summary-grid" style={{ gap: '1rem' }}>
            <p><strong>Duração média:</strong> {data.averageConsultationMinutes.averageMinutes} minutos</p>
            <p><strong>Consultas consideradas:</strong> {data.averageConsultationMinutes.appointmentCount}</p>
            <p className="muted-text">Período: {new Date(data.averageConsultationMinutes.period.from).toLocaleDateString('pt-BR')} a {new Date(data.averageConsultationMinutes.period.to).toLocaleDateString('pt-BR')}</p>
          </div>
        )}
      </article>
    </div>
  )
}

export function DashboardPage() {
  const now = new Date()
  const defaultTo = formatDateInput(now)
  const defaultFrom = formatDateInput(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [inactivityMonths, setInactivityMonths] = useState(2)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState<DetailModalKind | null>(null)

  const params: ReportFiltersParams = useMemo(
    () => ({ from, to, inactivityMonths }),
    [from, to, inactivityMonths],
  )

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', params],
    queryFn: () => fetchDashboardOverview(params),
  })

  if (overviewQuery.isLoading) {
    return <LoadingState message="Carregando métricas..." />
  }

  if (overviewQuery.isError) {
    return (
      <ErrorState
        message={overviewQuery.error.message}
        onRetry={() => void overviewQuery.refetch()}
      />
    )
  }

  const data = overviewQuery.data

  if (!data) {
    return <LoadingState />
  }

  const inactiveCount = data.patientsInactiveCount ?? data.patientsInactive?.length ?? 0
  const topConsultationsCount = data.patientsTopConsultations?.length ?? 0
  const newPatientsCount = data.patientsNewCount ?? data.patientsNew?.length ?? 0

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button type="button" className="secondary-button" onClick={() => setFilterModalOpen(true)}>
          Filtros
        </button>
      </div>

      {filterModalOpen && (
        <FilterModal
          from={from}
          to={to}
          inactivityMonths={inactivityMonths}
          onFrom={setFrom}
          onTo={setTo}
          onInactivityMonths={setInactivityMonths}
          onClose={() => setFilterModalOpen(false)}
        />
      )}

      {detailModal && (
        <DetailModal
          kind={detailModal}
          data={data}
          inactivityMonths={inactivityMonths}
          onClose={() => setDetailModal(null)}
        />
      )}

      <AnimatedGrid className="metrics-grid">
        <AnimatedGridItem variants={gridItemVariants}>
          <article className="card metric-card">
            <h3>Total de pacientes</h3>
            <strong>{data.totalPatients}</strong>
          </article>
        </AnimatedGridItem>
        <AnimatedGridItem variants={gridItemVariants}>
          <article className="card metric-card">
            <h3>Pacientes ativos</h3>
            <strong>{data.activePatients}</strong>
          </article>
        </AnimatedGridItem>
        <AnimatedGridItem variants={gridItemVariants}>
          <article className="card metric-card">
            <h3>Consultas do mês</h3>
            <strong>{data.monthAppointments}</strong>
          </article>
        </AnimatedGridItem>
        <AnimatedGridItem variants={gridItemVariants}>
          <article className="card metric-card">
            <h3>Próximas consultas</h3>
            <strong>{data.upcomingAppointments}</strong>
          </article>
        </AnimatedGridItem>
        <AnimatedGridItem variants={gridItemVariants}>
          <article className="card metric-card">
            <h3>Cancelamentos no mês</h3>
            <strong>{data.canceledAppointments}</strong>
          </article>
        </AnimatedGridItem>
      </AnimatedGrid>

      <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Análises</h3>
      <AnimatedGrid className="metrics-grid">
        {inactiveCount > 0 && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('patientsInactive')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('patientsInactive')}
          >
            <h3>Inativos há {inactivityMonths}+ meses</h3>
            <strong>{inactiveCount}</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para ver lista</p>
          </article>
          </AnimatedGridItem>
        )}

        {topConsultationsCount > 0 && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('patientsTopConsultations')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('patientsTopConsultations')}
          >
            <h3>Top consultas</h3>
            <strong>{topConsultationsCount}</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para ver ranking</p>
          </article>
          </AnimatedGridItem>
        )}

        {newPatientsCount > 0 && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('patientsNew')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('patientsNew')}
          >
            <h3>Novos pacientes</h3>
            <strong>{newPatientsCount}</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para ver lista</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.reactivationRate && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('reactivationRate')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('reactivationRate')}
          >
            <h3>Taxa de reativação</h3>
            <strong>{data.reactivationRate.reactivationRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para detalhes</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.loyaltyRate && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('loyaltyRate')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('loyaltyRate')}
          >
            <h3>Taxa de fidelidade</h3>
            <strong>{data.loyaltyRate.loyaltyRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para detalhes</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.rescheduleRate && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('rescheduleRate')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('rescheduleRate')}
          >
            <h3>Taxa de remarcação</h3>
            <strong>{data.rescheduleRate.rescheduleRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para detalhes</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.interactionsSummary && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('interactionsSummary')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('interactionsSummary')}
          >
            <h3>Interações WhatsApp</h3>
            <strong>{data.interactionsSummary.total}</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para detalhes</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.agendaOccupancy && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('agendaOccupancy')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('agendaOccupancy')}
          >
            <h3>Ocupação da agenda</h3>
            <strong>{data.agendaOccupancy.occupancyRatePercent}%</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para detalhes</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.appointmentsByMode && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('appointmentsByMode')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('appointmentsByMode')}
          >
            <h3>Por modo</h3>
            <strong>{data.appointmentsByMode.total}</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Presencial · Remoto</p>
          </article>
          </AnimatedGridItem>
        )}

        {data.averageConsultationMinutes && (
          <AnimatedGridItem variants={gridItemVariants}>
          <article
            className="card metric-card metric-card-clickable"
            onClick={() => setDetailModal('averageConsultationMinutes')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setDetailModal('averageConsultationMinutes')}
          >
            <h3>Duração média</h3>
            <strong>{data.averageConsultationMinutes.averageMinutes} min</strong>
            <p className="muted-text" style={{ fontSize: '0.8em' }}>Clique para detalhes</p>
          </article>
          </AnimatedGridItem>
        )}
      </AnimatedGrid>

      {data.period && (
        <p className="muted-text" style={{ marginTop: '1rem', fontSize: '0.85em' }}>
          Período aplicado: {new Date(data.period.from).toLocaleDateString('pt-BR')} a {new Date(data.period.to).toLocaleDateString('pt-BR')}
        </p>
      )}
    </section>
  )
}

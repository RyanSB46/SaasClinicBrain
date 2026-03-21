import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clearAllPatientData,
  disconnectGoogleIntegration,
  fetchDashboardConfig,
  fetchGoogleConnectUrl,
  fetchGoogleIntegrationStatus,
  fetchReportConfig,
  fetchSettingsFeatures,
  fetchSettingsMessages,
  updateDashboardConfig,
  updateReportConfig,
  updateSettingsFeatures,
  updateSettingsMessages,
  type DashboardConfig,
  type ProfessionalFeatureFlags,
  type ReportConfig,
} from '../../application/services/clinic-api'
import { ErrorState, LoadingState } from '../components/feedback-states'

type SettingsAccordionProps = {
  sectionKey: string
  title: string
  description: string
  expanded: Set<string>
  onToggle: (key: string) => void
  children: ReactNode
}

function SettingsAccordionSection({
  sectionKey,
  title,
  description,
  expanded,
  onToggle,
  children,
}: SettingsAccordionProps) {
  const isOpen = expanded.has(sectionKey)
  return (
    <article className="card settings-accordion">
      <button
        type="button"
        className="settings-accordion-trigger"
        aria-expanded={isOpen}
        aria-controls={`settings-panel-${sectionKey}`}
        id={`settings-head-${sectionKey}`}
        onClick={() => onToggle(sectionKey)}
      >
        <span className="settings-accordion-trigger-text">
          <span className="settings-accordion-title">{title}</span>
          {isOpen ? <span className="settings-accordion-desc">{description}</span> : null}
        </span>
        <span
          className={`settings-accordion-chevron${isOpen ? ' settings-accordion-chevron-open' : ''}`}
          aria-hidden
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <div
        id={`settings-panel-${sectionKey}`}
        role="region"
        aria-labelledby={`settings-head-${sectionKey}`}
        className="settings-accordion-panel"
        data-open={isOpen}
      >
        <div className="settings-accordion-panel-inner">{children}</div>
      </div>
    </article>
  )
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set())
  const [features, setFeatures] = useState<ProfessionalFeatureFlags | null>(null)
  const [featuresSaved, setFeaturesSaved] = useState(false)
  const [featuresError, setFeaturesError] = useState<string | null>(null)
  const [clearPatientsFeedback, setClearPatientsFeedback] = useState<string | null>(null)
  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null)
  const [reportConfig, setReportConfig] = useState<ReportConfig | null>(null)
  const [configSaved, setConfigSaved] = useState(false)

  const settingsQuery = useQuery({
    queryKey: ['settings-messages'],
    queryFn: fetchSettingsMessages,
  })

  const featuresQuery = useQuery({
    queryKey: ['settings-features'],
    queryFn: fetchSettingsFeatures,
  })

  const googleStatusQuery = useQuery({
    queryKey: ['google-integration-status'],
    queryFn: fetchGoogleIntegrationStatus,
  })

  const dashboardConfigQuery = useQuery({
    queryKey: ['dashboard-config'],
    queryFn: fetchDashboardConfig,
  })

  const reportConfigQuery = useQuery({
    queryKey: ['report-config'],
    queryFn: fetchReportConfig,
  })

  useEffect(() => {
    if (settingsQuery.data) {
      setWelcomeMessage(settingsQuery.data.welcomeMessage ?? '')
      setConfirmationMessage(settingsQuery.data.confirmationMessage ?? '')
      setCancellationPolicy(settingsQuery.data.cancellationPolicy ?? '')
    }
  }, [settingsQuery.data])

  useEffect(() => {
    if (featuresQuery.data) {
      setFeatures(featuresQuery.data)
    }
  }, [featuresQuery.data])

  useEffect(() => {
    if (dashboardConfigQuery.data) {
      setDashboardConfig(dashboardConfigQuery.data)
    }
  }, [dashboardConfigQuery.data])

  useEffect(() => {
    if (reportConfigQuery.data) {
      setReportConfig(reportConfigQuery.data)
    }
  }, [reportConfigQuery.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateSettingsMessages({
        welcomeMessage: welcomeMessage.trim(),
        confirmationMessage: confirmationMessage.trim(),
        cancellationPolicy: cancellationPolicy.trim(),
      }),
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const saveFeaturesMutation = useMutation({
    mutationFn: (input: Partial<ProfessionalFeatureFlags>) => updateSettingsFeatures(input),
    onSuccess: (result) => {
      setFeatures(result)
      setFeaturesSaved(true)
      setTimeout(() => setFeaturesSaved(false), 2500)
    },
  })

  const disconnectGoogleMutation = useMutation({
    mutationFn: disconnectGoogleIntegration,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['google-integration-status'] })
    },
  })

  const updateDashboardConfigMutation = useMutation({
    mutationFn: updateDashboardConfig,
    onSuccess: (result) => {
      setDashboardConfig(result)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2500)
      void queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
    },
  })

  const updateReportConfigMutation = useMutation({
    mutationFn: updateReportConfig,
    onSuccess: (result) => {
      setReportConfig(result)
      setConfigSaved(true)
      setTimeout(() => setConfigSaved(false), 2500)
    },
  })

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    if (welcomeMessage.trim().length === 0) {
      setLocalError('A mensagem de boas-vindas é obrigatória.')
      return
    }

    if (confirmationMessage.trim().length === 0) {
      setLocalError('A mensagem de confirmação é obrigatória.')
      return
    }

    saveMutation.mutate()
  }

  if (settingsQuery.isLoading) {
    return <LoadingState message="Carregando configurações..." />
  }

  if (settingsQuery.isError) {
    return (
      <ErrorState
        message={settingsQuery.error.message}
        onRetry={() => {
          void settingsQuery.refetch()
        }}
      />
    )
  }

  if (featuresQuery.isLoading) {
    return <LoadingState message="Carregando configurações de funcionalidades..." />
  }

  if (featuresQuery.isError) {
    return (
      <ErrorState
        message={featuresQuery.error.message}
        onRetry={() => {
          void featuresQuery.refetch()
        }}
      />
    )
  }

  function handleFeatureToggle(key: keyof ProfessionalFeatureFlags, value: boolean) {
    if (!features) {
      return
    }

    setFeaturesError(null)

    if (key === 'settingsEnabled' && !value) {
      setFeaturesError('A funcionalidade de Configurações não pode ser desativada nesta tela.')
      return
    }

    setFeatures((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        [key]: value,
      }
    })

    saveFeaturesMutation.mutate({
      [key]: value,
    })
  }

  async function handleConnectGoogle() {
    try {
      const result = await fetchGoogleConnectUrl()
      window.location.href = result.connectUrl
    } catch (error) {
      setFeaturesError(error instanceof Error ? error.message : 'Falha ao iniciar conexão com Google')
    }
  }

  const renderedFeatures = features ?? featuresQuery.data
  const googleStatus = googleStatusQuery.data

  return (
    <section className="reports-grid settings-page-root">
      <p className="settings-page-lead muted-text">
        Toque no título de cada bloco para expandir ou recolher o conteúdo. O tema claro/escuro fica no menu à
        esquerda.
      </p>

      <SettingsAccordionSection
        sectionKey="messages"
        title="Mensagens padrão do chatbot"
        description="Textos usados nas interações automáticas com pacientes."
        expanded={expandedSections}
        onToggle={toggleSection}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="welcome-message">
            Mensagem de boas-vindas
          </label>
          <textarea
            id="welcome-message"
            className="field-textarea"
            value={welcomeMessage}
            onChange={(event) => setWelcomeMessage(event.target.value)}
            rows={3}
          />
          <p className="muted-text" style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Use <code>{'{{nome}}'}</code> para inserir o nome do profissional na mensagem.
          </p>

          <label className="field-label" htmlFor="confirmation-message">
            Mensagem de confirmação
          </label>
          <textarea
            id="confirmation-message"
            className="field-textarea"
            value={confirmationMessage}
            onChange={(event) => setConfirmationMessage(event.target.value)}
            rows={3}
          />

          <label className="field-label" htmlFor="cancellation-policy">
            Política de cancelamento
          </label>
          <textarea
            id="cancellation-policy"
            className="field-textarea"
            value={cancellationPolicy}
            onChange={(event) => setCancellationPolicy(event.target.value)}
            rows={4}
          />

          {(localError || saveMutation.error) && (
            <p className="error-text">{localError ?? saveMutation.error?.message}</p>
          )}

          {saved && <p className="success-text">Configurações salvas com sucesso.</p>}

          <button type="submit" className="primary-button" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </form>
      </SettingsAccordionSection>

      <SettingsAccordionSection
        sectionKey="features"
        title="Funcionalidades por profissional (MVP)"
        description="Ative ou desative os módulos principais para esta conta."
        expanded={expandedSections}
        onToggle={toggleSection}
      >
        {renderedFeatures ? (
          <div className="form-grid">
            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.dashboardEnabled}
                onChange={(event) => handleFeatureToggle('dashboardEnabled', event.target.checked)}
              />
              Dashboard
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.agendaEnabled}
                onChange={(event) => handleFeatureToggle('agendaEnabled', event.target.checked)}
              />
              Agenda
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.manualActionEnabled}
                onChange={(event) => handleFeatureToggle('manualActionEnabled', event.target.checked)}
                disabled={!renderedFeatures.agendaEnabled}
              />
              Ações manuais na agenda
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.patientsEnabled}
                onChange={(event) => handleFeatureToggle('patientsEnabled', event.target.checked)}
              />
              Pacientes
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.reportsEnabled}
                onChange={(event) => handleFeatureToggle('reportsEnabled', event.target.checked)}
              />
              Relatórios
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.requestsEnabled}
                onChange={(event) => handleFeatureToggle('requestsEnabled', event.target.checked)}
              />
              Solicitações
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.settingsEnabled}
                onChange={(event) => handleFeatureToggle('settingsEnabled', event.target.checked)}
              />
              Configurações
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.patientPortalEnabled}
                onChange={(event) => handleFeatureToggle('patientPortalEnabled', event.target.checked)}
              />
              Portal do paciente
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.webhookEnabled}
                onChange={(event) => handleFeatureToggle('webhookEnabled', event.target.checked)}
              />
              Webhook
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.googleCalendarEnabled}
                onChange={(event) => handleFeatureToggle('googleCalendarEnabled', event.target.checked)}
              />
              Google Calendar
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.googleMeetEnabled}
                onChange={(event) => handleFeatureToggle('googleMeetEnabled', event.target.checked)}
                disabled={!renderedFeatures.googleCalendarEnabled}
              />
              Google Meet (consultas remotas)
            </label>

            <label className="status-chip">
              <input
                type="checkbox"
                checked={renderedFeatures.googleSendInviteToPatient}
                onChange={(event) => handleFeatureToggle('googleSendInviteToPatient', event.target.checked)}
                disabled={!renderedFeatures.googleCalendarEnabled}
              />
              Enviar convite por email ao paciente
            </label>

            {(featuresError || saveFeaturesMutation.error) && (
              <p className="error-text">{featuresError ?? saveFeaturesMutation.error?.message}</p>
            )}

            {featuresSaved && <p className="success-text">Funcionalidades atualizadas com sucesso.</p>}
          </div>
        ) : null}
      </SettingsAccordionSection>

      <SettingsAccordionSection
        sectionKey="customize"
        title="Personalização do Dashboard e Relatórios"
        description="Padrões de período, widgets de análise e tipos de gráfico nos modais."
        expanded={expandedSections}
        onToggle={toggleSection}
      >
        {(dashboardConfigQuery.isLoading || reportConfigQuery.isLoading) ? (
          <LoadingState message="Carregando personalização..." />
        ) : dashboardConfig && reportConfig ? (
          <div className="form-grid">
            <label className="field-label" htmlFor="dashboard-inactivity">Meses para inatividade (padrão)</label>
            <select
              id="dashboard-inactivity"
              className="field-input"
              value={dashboardConfig.inactivityMonths ?? 2}
              onChange={(e) =>
                updateDashboardConfigMutation.mutate({
                  inactivityMonths: Number(e.target.value),
                })
              }
            >
              {[1, 2, 3, 5, 6, 12].map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? 'mês' : 'meses'}</option>
              ))}
            </select>

            <label className="field-label" htmlFor="dashboard-top-limit">Limite no top de listas</label>
            <select
              id="dashboard-top-limit"
              className="field-input"
              value={dashboardConfig.topLimit ?? 10}
              onChange={(e) =>
                updateDashboardConfigMutation.mutate({
                  topLimit: Number(e.target.value),
                })
              }
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <label className="field-label" htmlFor="dashboard-period">Período padrão (dias)</label>
            <select
              id="dashboard-period"
              className="field-input"
              value={dashboardConfig.defaultPeriodDays ?? 30}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateDashboardConfigMutation.mutate({ defaultPeriodDays: v })
                updateReportConfigMutation.mutate({ defaultPeriodDays: v })
              }}
            >
              {[7, 30, 60, 90].map((d) => (
                <option key={d} value={d}>{d} dias</option>
              ))}
            </select>

            <div style={{ gridColumn: '1 / -1' }}>
              <p className="field-label">Widgets do dashboard (análises)</p>
              <p className="muted-text" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Escolha quais métricas exibir na seção Análises do dashboard.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                {[
                  { id: 'patientsInactive', label: 'Inativos há X meses' },
                  { id: 'patientsTopConsultations', label: 'Top consultas' },
                  { id: 'patientsNew', label: 'Novos pacientes' },
                  { id: 'reactivationRate', label: 'Taxa de reativação' },
                  { id: 'loyaltyRate', label: 'Taxa de fidelidade' },
                  { id: 'rescheduleRate', label: 'Taxa de remarcação' },
                  { id: 'interactionsSummary', label: 'Interações WhatsApp' },
                  { id: 'agendaOccupancy', label: 'Ocupação da agenda' },
                  { id: 'appointmentsByMode', label: 'Consultas por modo' },
                  { id: 'averageConsultationMinutes', label: 'Duração média' },
                ].map((w) => {
                  const enabled = new Set(dashboardConfig.enabledWidgets ?? [])
                  const checked = enabled.has(w.id)
                  return (
                    <label key={w.id} className="status-chip">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(enabled)
                          if (checked) next.delete(w.id)
                          else next.add(w.id)
                          updateDashboardConfigMutation.mutate({
                            enabledWidgets: Array.from(next),
                          })
                        }}
                      />
                      {w.label}
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <p className="field-label">Tipos de gráfico nos modais de detalhe</p>
              <p className="muted-text" style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Visualizações disponíveis ao clicar nas métricas do dashboard (tabela, barras, colunas, linha, área,
                pizza, donut, radar).
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem' }}>
                {[
                  { id: 'table', label: 'Tabela' },
                  { id: 'bar', label: 'Barras' },
                  { id: 'column', label: 'Colunas' },
                  { id: 'line', label: 'Linha' },
                  { id: 'area', label: 'Área' },
                  { id: 'pie', label: 'Pizza' },
                  { id: 'donut', label: 'Donut' },
                  { id: 'radar', label: 'Radar' },
                ].map((c) => {
                  const enabled = new Set(dashboardConfig.enabledChartTypes ?? [])
                  const checked = enabled.has(c.id)
                  return (
                    <label key={c.id} className="status-chip">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(enabled)
                          if (checked) next.delete(c.id)
                          else next.add(c.id)
                          updateDashboardConfigMutation.mutate({
                            enabledChartTypes: Array.from(next),
                          })
                        }}
                      />
                      {c.label}
                    </label>
                  )
                })}
              </div>
            </div>

            {configSaved && <p className="success-text">Configurações salvas com sucesso.</p>}
          </div>
        ) : null}
      </SettingsAccordionSection>

      <SettingsAccordionSection
        sectionKey="google"
        title="Integração com Google Calendar"
        description="Sincronizar consultas e Google Meet com sua conta Google."
        expanded={expandedSections}
        onToggle={toggleSection}
      >
        {googleStatusQuery.isLoading ? (
          <LoadingState message="Carregando status da integração..." />
        ) : googleStatusQuery.isError ? (
          <ErrorState
            message={googleStatusQuery.error.message}
            onRetry={() => {
              void googleStatusQuery.refetch()
            }}
          />
        ) : (
          <div className="form-grid">
            <p className="muted-text">
              Status: {googleStatus?.connected ? 'Conectado' : 'Desconectado'}
            </p>
            <p className="muted-text">
              Calendário: {googleStatus?.calendarId ?? '—'}
            </p>
            <p className="muted-text">
              Conectado em:{' '}
              {googleStatus?.connectedAt
                ? new Date(googleStatus.connectedAt).toLocaleString('pt-BR')
                : '—'}
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="primary-button" onClick={() => void handleConnectGoogle()}>
                {googleStatus?.connected ? 'Reconectar Google' : 'Conectar Google'}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!googleStatus?.connected || disconnectGoogleMutation.isPending}
                onClick={() => {
                  if (window.confirm('Desconectar Google Calendar desta conta?')) {
                    disconnectGoogleMutation.mutate()
                  }
                }}
              >
                {disconnectGoogleMutation.isPending ? 'Desconectando...' : 'Desconectar'}
              </button>
            </div>

            {disconnectGoogleMutation.error && (
              <p className="error-text">{disconnectGoogleMutation.error.message}</p>
            )}
          </div>
        )}
      </SettingsAccordionSection>

      <SettingsAccordionSection
        sectionKey="simulation"
        title="Simulação de cenários"
        description="Limpar dados de pacientes para testar fluxos como paciente novo ou com histórico."
        expanded={expandedSections}
        onToggle={toggleSection}
      >
        <div className="form-grid">
          <button
            type="button"
            className="secondary-button"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              if (
                window.confirm(
                  'Isso vai remover TODOS os pacientes, consultas, mensagens e sessões do WhatsApp. Não há como desfazer. Continuar?',
                )
              ) {
                clearAllPatientData()
                  .then((res) => {
                    setClearPatientsFeedback(res.message)
                    setTimeout(() => setClearPatientsFeedback(null), 4000)
                    void queryClient.invalidateQueries()
                  })
                  .catch((err) => {
                    setClearPatientsFeedback(err instanceof Error ? err.message : 'Erro ao limpar dados')
                    setTimeout(() => setClearPatientsFeedback(null), 4000)
                  })
              }
            }}
          >
            Limpar dados de pacientes
          </button>
          {clearPatientsFeedback && (
            <p className={clearPatientsFeedback.includes('sucesso') ? 'success-text' : 'error-text'}>
              {clearPatientsFeedback}
            </p>
          )}
        </div>
      </SettingsAccordionSection>
    </section>
  )
}

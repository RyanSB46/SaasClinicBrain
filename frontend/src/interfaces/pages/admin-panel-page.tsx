import { useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type AdminProfessionalDetail,
  type AdminProfessionalListItem,
  type ProfessionalFeatureFlags,
  createAdminProfessional,
  createAdminStaff,
  deleteAdminStaff,
  fetchAdminProfessional,
  fetchAdminProfessionals,
  resetAdminProfessional,
  toggleAdminProfessionalActive,
  updateAdminProfessional,
  updateAdminProfessionalCredentials,
  updateAdminProfessionalFeatures,
  updateAdminStaff,
  DEFAULT_PROFESSIONAL_FEATURE_FLAGS,
} from '../../application/services/clinic-api'
import { ErrorState, LoadingState } from '../components/feedback-states'

const FEATURE_LABELS: Record<keyof ProfessionalFeatureFlags, string> = {
  dashboardEnabled: 'Dashboard',
  agendaEnabled: 'Agenda',
  manualActionEnabled: 'Ações manuais na agenda',
  patientsEnabled: 'Pacientes',
  reportsEnabled: 'Relatórios',
  requestsEnabled: 'Solicitações',
  settingsEnabled: 'Configurações',
  patientPortalEnabled: 'Portal do paciente',
  webhookEnabled: 'Webhook',
  googleCalendarEnabled: 'Google Calendar',
  googleMeetEnabled: 'Google Meet',
  googleSendInviteToPatient: 'Convite Google ao paciente',
}

export function AdminPanelPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackError, setFeedbackError] = useState(false)

  const professionalsQuery = useQuery({
    queryKey: ['admin-professionals'],
    queryFn: fetchAdminProfessionals,
  })

  const detailQuery = useQuery({
    queryKey: ['admin-professional', selectedId],
    queryFn: () => fetchAdminProfessional(selectedId!),
    enabled: Boolean(selectedId),
  })

  const createProfessionalMutation = useMutation({
    mutationFn: createAdminProfessional,
    onSuccess: async () => {
      setFeedback('Profissional criado com sucesso.')
      setFeedbackError(false)
      await queryClient.invalidateQueries({ queryKey: ['admin-professionals'] })
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const updateProfessionalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAdminProfessional(id, data),
    onSuccess: async () => {
      setFeedback('Profissional atualizado.')
      setFeedbackError(false)
      await queryClient.invalidateQueries({ queryKey: ['admin-professionals'] })
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const updateCredentialsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { email?: string; password?: string } }) =>
      updateAdminProfessionalCredentials(id, data),
    onSuccess: async () => {
      setFeedback('Credenciais atualizadas.')
      setFeedbackError(false)
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const resetMutation = useMutation({
    mutationFn: resetAdminProfessional,
    onSuccess: async () => {
      setFeedback('Dados do profissional resetados.')
      setFeedbackError(false)
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
        await queryClient.invalidateQueries({ queryKey: ['admin-professionals'] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleAdminProfessionalActive(id, isActive),
    onSuccess: async () => {
      setFeedback('Status atualizado.')
      setFeedbackError(false)
      await queryClient.invalidateQueries({ queryKey: ['admin-professionals'] })
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const updateFeaturesMutation = useMutation({
    mutationFn: ({ id, features }: { id: string; features: Partial<ProfessionalFeatureFlags> }) =>
      updateAdminProfessionalFeatures(id, features),
    onSuccess: async () => {
      setFeedback('Funcionalidades atualizadas.')
      setFeedbackError(false)
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const createStaffMutation = useMutation({
    mutationFn: ({ professionalId, data }: { professionalId: string; data: { name: string; email: string; password: string } }) =>
      createAdminStaff(professionalId, data),
    onSuccess: async () => {
      setFeedback('Funcionário adicionado.')
      setFeedbackError(false)
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
        await queryClient.invalidateQueries({ queryKey: ['admin-professionals'] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const updateStaffMutation = useMutation({
    mutationFn: ({
      professionalId,
      staffId,
      data,
    }: {
      professionalId: string
      staffId: string
      data: { name?: string; email?: string; password?: string; isActive?: boolean }
    }) => updateAdminStaff(professionalId, staffId, data),
    onSuccess: async () => {
      setFeedback('Funcionário atualizado.')
      setFeedbackError(false)
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  const deleteStaffMutation = useMutation({
    mutationFn: ({ professionalId, staffId }: { professionalId: string; staffId: string }) =>
      deleteAdminStaff(professionalId, staffId),
    onSuccess: async () => {
      setFeedback('Funcionário removido.')
      setFeedbackError(false)
      if (selectedId) {
        await queryClient.invalidateQueries({ queryKey: ['admin-professional', selectedId] })
        await queryClient.invalidateQueries({ queryKey: ['admin-professionals'] })
      }
    },
    onError: (err) => {
      setFeedback(err.message)
      setFeedbackError(true)
    },
  })

  if (professionalsQuery.isLoading) {
    return <LoadingState message="Carregando profissionais..." />
  }

  if (professionalsQuery.isError) {
    return (
      <ErrorState
        message={professionalsQuery.error.message}
        onRetry={() => void professionalsQuery.refetch()}
      />
    )
  }

  const professionals = professionalsQuery.data ?? []
  const selected = selectedId ? detailQuery.data : null

  return (
    <section className="admin-grid">
      <article className="card">
        <h3>Profissionais</h3>
        <p className="muted-text">Gerencie profissionais e funcionários.</p>

        <form
          className="form-grid"
          onSubmit={(e: FormEvent<HTMLFormElement>) => {
            e.preventDefault()
            const form = e.currentTarget
            const data = {
              name: (form.querySelector('#new-prof-name') as HTMLInputElement).value.trim(),
              email: (form.querySelector('#new-prof-email') as HTMLInputElement).value.trim(),
              password: (form.querySelector('#new-prof-password') as HTMLInputElement).value,
            }
            if (data.name.length < 2 || !data.email.includes('@') || data.password.length < 8) {
              setFeedback('Preencha nome, email válido e senha (mín. 8 caracteres).')
              setFeedbackError(true)
              return
            }
            setFeedback(null)
            createProfessionalMutation.mutate(data)
            form.reset()
          }}
        >
          <div className="filter-panel-grid">
            <div>
              <label className="field-label" htmlFor="new-prof-name">
                Nome
              </label>
              <input id="new-prof-name" className="field-input" required placeholder="Dra. Nome" />
            </div>
            <div>
              <label className="field-label" htmlFor="new-prof-email">
                Email
              </label>
              <input id="new-prof-email" type="email" className="field-input" required placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="field-label" htmlFor="new-prof-password">
                Senha
              </label>
              <input id="new-prof-password" type="password" className="field-input" required minLength={8} placeholder="Mín. 8 caracteres" />
            </div>
          </div>
          <button type="submit" className="primary-button" disabled={createProfessionalMutation.isPending}>
            {createProfessionalMutation.isPending ? 'Criando...' : 'Adicionar profissional'}
          </button>
        </form>

        <h4>Lista</h4>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Status</th>
                <th>Pacientes</th>
                <th>Agendamentos</th>
                <th>Funcionários</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p: AdminProfessionalListItem) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.email}</td>
                  <td>{p.isActive ? 'Ativo' : 'Inativo'}</td>
                  <td>{p.patientsCount}</td>
                  <td>{p.appointmentsCount}</td>
                  <td>{p.staffCount}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setSelectedId(p.id)}
                    >
                      Gerenciar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      {selectedId && (
        <AdminProfessionalDetailPanel
          selected={selected}
          isLoading={detailQuery.isLoading}
          onClose={() => setSelectedId(null)}
          onFeedback={(msg, isError) => {
            setFeedback(msg)
            setFeedbackError(isError)
          }}
          onUpdate={(data) => updateProfessionalMutation.mutate({ id: selectedId, data })}
          onUpdateCredentials={(data) => updateCredentialsMutation.mutate({ id: selectedId, data })}
          onReset={() => {
            if (window.confirm('Tem certeza? Isso remove agendamentos, sessões WhatsApp e bloqueios. Pacientes e configurações são mantidos.')) {
              resetMutation.mutate(selectedId)
            }
          }}
          onToggleActive={(isActive) => toggleActiveMutation.mutate({ id: selectedId, isActive })}
          onUpdateFeatures={(features) => updateFeaturesMutation.mutate({ id: selectedId, features })}
          onCreateStaff={(data) => createStaffMutation.mutate({ professionalId: selectedId, data })}
          onUpdateStaff={(staffId, data) =>
            updateStaffMutation.mutate({ professionalId: selectedId, staffId, data })
          }
          onDeleteStaff={(staffId) => {
            if (window.confirm('Remover este funcionário?')) {
              deleteStaffMutation.mutate({ professionalId: selectedId, staffId })
            }
          }}
          isUpdating={
            updateProfessionalMutation.isPending ||
            updateCredentialsMutation.isPending ||
            resetMutation.isPending ||
            toggleActiveMutation.isPending ||
            updateFeaturesMutation.isPending ||
            createStaffMutation.isPending ||
            updateStaffMutation.isPending ||
            deleteStaffMutation.isPending
          }
        />
      )}

      {feedback && (
        <p className={feedbackError ? 'error-text' : 'success-text'} style={{ marginTop: 16 }}>
          {feedback}
        </p>
      )}
    </section>
  )
}

type AdminProfessionalDetailPanelProps = {
  selected: AdminProfessionalDetail | null | undefined
  isLoading: boolean
  onClose: () => void
  onFeedback: (msg: string, isError: boolean) => void
  onUpdate: (data: Record<string, unknown>) => void
  onUpdateCredentials: (data: { email?: string; password?: string }) => void
  onReset: () => void
  onToggleActive: (isActive: boolean) => void
  onUpdateFeatures: (features: Partial<ProfessionalFeatureFlags>) => void
  onCreateStaff: (data: { name: string; email: string; password: string }) => void
  onUpdateStaff: (staffId: string, data: { name?: string; email?: string; password?: string; isActive?: boolean }) => void
  onDeleteStaff: (staffId: string) => void
  isUpdating: boolean
}

function AdminProfessionalDetailPanel({
  selected,
  isLoading,
  onClose,
  onUpdate,
  onUpdateCredentials,
  onReset,
  onToggleActive,
  onUpdateFeatures,
  onCreateStaff,
  onUpdateStaff,
  onDeleteStaff,
  isUpdating,
}: AdminProfessionalDetailPanelProps) {
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [credEmail, setCredEmail] = useState('')
  const [credPassword, setCredPassword] = useState('')
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editStaffEmail, setEditStaffEmail] = useState('')
  const [editStaffPassword, setEditStaffPassword] = useState('')

  if (isLoading || !selected) {
    return (
      <article className="card">
        <LoadingState message="Carregando detalhes..." />
      </article>
    )
  }

  const features = selected.settings?.features ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS

  const handleUpdate = (e: FormEvent) => {
    e.preventDefault()
    onUpdate({
      name: editName || selected.name,
      email: editEmail || selected.email,
      phoneNumber: editPhone !== '' ? editPhone : null,
    })
  }

  const handleCredentials = (e: FormEvent) => {
    e.preventDefault()
    const data: { email?: string; password?: string } = {}
    if (credEmail.trim()) data.email = credEmail.trim()
    if (credPassword.length >= 8) data.password = credPassword
    if (Object.keys(data).length === 0) return
    onUpdateCredentials(data)
    setCredEmail('')
    setCredPassword('')
  }

  const handleCreateStaff = (e: FormEvent) => {
    e.preventDefault()
    if (staffName.trim().length < 2 || !staffEmail.includes('@') || staffPassword.length < 8) return
    onCreateStaff({ name: staffName.trim(), email: staffEmail.trim(), password: staffPassword })
    setStaffName('')
    setStaffEmail('')
    setStaffPassword('')
  }

  return (
    <article className="card modal-card modal-card-large">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h3>{selected.name} — Detalhes</h3>
        <button type="button" className="secondary-button" onClick={onClose}>
          Fechar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          className={selected.isActive ? 'primary-button' : 'secondary-button'}
          onClick={() => onToggleActive(!selected.isActive)}
          disabled={isUpdating}
        >
          {selected.isActive ? 'Desativar profissional' : 'Ativar profissional'}
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onReset}
          disabled={isUpdating}
        >
          Resetar dados
        </button>
      </div>

      <h4>Editar cadastro</h4>
      <form className="form-grid" onSubmit={handleUpdate}>
        <div className="filter-panel-grid">
          <div>
            <label className="field-label">Nome</label>
            <input
              className="field-input"
              value={editName || selected.name}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome"
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              className="field-input"
              value={editEmail || selected.email}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="field-label">Telefone</label>
            <input
              className="field-input"
              value={editPhone !== '' ? editPhone : (selected.phoneNumber ?? '')}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="(27) 99999-9999"
            />
          </div>
        </div>
        <button type="submit" className="secondary-button" disabled={isUpdating}>
          Salvar
        </button>
      </form>

      <h4>Alterar credenciais de login</h4>
      <form className="form-grid" onSubmit={handleCredentials}>
        <div className="filter-panel-grid">
          <div>
            <label className="field-label">Novo email</label>
            <input
              type="email"
              className="field-input"
              value={credEmail}
              onChange={(e) => setCredEmail(e.target.value)}
              placeholder="deixe em branco para manter"
            />
          </div>
          <div>
            <label className="field-label">Nova senha</label>
            <input
              type="password"
              className="field-input"
              value={credPassword}
              onChange={(e) => setCredPassword(e.target.value)}
              placeholder="mín. 8 caracteres"
            />
          </div>
        </div>
        <button type="submit" className="secondary-button" disabled={isUpdating}>
          Atualizar credenciais
        </button>
      </form>

      <h4>Funcionalidades (feature flags)</h4>
      <p className="muted-text">Ative ou desative o que este profissional pode usar.</p>
      <div className="status-chip-group" style={{ flexWrap: 'wrap', gap: 8 }}>
        {(Object.keys(FEATURE_LABELS) as Array<keyof ProfessionalFeatureFlags>).map((key) => (
          <label key={key} className="status-chip">
            <input
              type="checkbox"
              checked={features[key]}
              onChange={(e) => onUpdateFeatures({ [key]: e.target.checked })}
              disabled={isUpdating}
            />
            {FEATURE_LABELS[key]}
          </label>
        ))}
      </div>

      <h4>Funcionários</h4>
      <p className="muted-text">Adicione funcionários que acessam os dados deste profissional.</p>
      <form className="form-grid" onSubmit={handleCreateStaff}>
        <div className="filter-panel-grid">
          <div>
            <label className="field-label">Nome</label>
            <input
              className="field-input"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Nome do funcionário"
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              className="field-input"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="field-label">Senha</label>
            <input
              type="password"
              className="field-input"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              minLength={8}
              placeholder="Mín. 8 caracteres"
            />
          </div>
        </div>
        <button type="submit" className="primary-button" disabled={isUpdating}>
          Adicionar funcionário
        </button>
      </form>

      {selected.staff.length > 0 && (
        <div className="table-wrapper" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {selected.staff.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.isActive ? 'Ativo' : 'Inativo'}</td>
                  <td>
                    {editingStaffId === s.id ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                        <div>
                          <label className="field-label" style={{ fontSize: '0.85rem' }}>
                            Novo email
                          </label>
                          <input
                            type="email"
                            className="field-input"
                            value={editStaffEmail}
                            onChange={(e) => setEditStaffEmail(e.target.value)}
                            placeholder={s.email}
                            style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <div>
                          <label className="field-label" style={{ fontSize: '0.85rem' }}>
                            Nova senha
                          </label>
                          <input
                            type="password"
                            className="field-input"
                            value={editStaffPassword}
                            onChange={(e) => setEditStaffPassword(e.target.value)}
                            placeholder="mín. 8 caracteres"
                            style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            const data: { email?: string; password?: string } = {}
                            if (editStaffEmail.trim()) data.email = editStaffEmail.trim()
                            if (editStaffPassword.length >= 8) data.password = editStaffPassword
                            if (Object.keys(data).length > 0) {
                              onUpdateStaff(s.id, data)
                              setEditingStaffId(null)
                              setEditStaffEmail('')
                              setEditStaffPassword('')
                            }
                          }}
                          disabled={isUpdating}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setEditingStaffId(null)
                            setEditStaffEmail('')
                            setEditStaffPassword('')
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            setEditingStaffId(s.id)
                            setEditStaffEmail('')
                            setEditStaffPassword('')
                          }}
                          disabled={isUpdating}
                        >
                          Editar credenciais
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => {
                            onUpdateStaff(s.id, { isActive: !s.isActive })
                          }}
                          disabled={isUpdating}
                        >
                          {s.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => onDeleteStaff(s.id)}
                          disabled={isUpdating}
                        >
                          Remover
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  )
}

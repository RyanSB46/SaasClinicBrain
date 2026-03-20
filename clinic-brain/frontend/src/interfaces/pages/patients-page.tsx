import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPatient,
  fetchPatients,
  updatePatient,
  type PatientListItem,
} from '../../application/services/clinic-api'
import { EmptyState, ErrorState, LoadingState } from '../components/feedback-states'

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

type SortField = 'name' | 'createdAt'
type SortDir = 'asc' | 'desc'

function PatientFormModal({
  patient,
  onClose,
  onSuccess,
}: {
  patient?: PatientListItem | null
  onClose: () => void
  onSuccess: () => void
}) {
  const isEdit = !!patient
  const queryClient = useQueryClient()
  const [name, setName] = useState(patient?.name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(patient?.phoneNumber ?? '')
  const [email, setEmail] = useState(patient?.email ?? '')
  const [cpf, setCpf] = useState(patient?.cpf ? formatCpf(patient.cpf) : '')
  const [notes, setNotes] = useState(patient?.notes ?? '')
  const [formError, setFormError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () =>
      createPatient({
        name: name.trim(),
        phoneNumber: normalizePhone(phoneNumber),
        email: email.trim() || undefined,
        cpf: normalizePhone(cpf) || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patients'] })
      onSuccess()
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePatient(patient!.id, {
        name: name.trim(),
        phoneNumber: normalizePhone(phoneNumber),
        email: email.trim() || undefined,
        cpf: normalizePhone(cpf) || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['patients'] })
      onSuccess()
      onClose()
    },
  })

  const mutation = isEdit ? updateMutation : createMutation

  function validateForm(): boolean {
    if (name.trim().length < 2) {
      setFormError('Informe o nome com ao menos 2 caracteres.')
      return false
    }
    if (normalizePhone(phoneNumber).length < 10) {
      setFormError('Informe um telefone válido com DDD.')
      return false
    }
    if (email.trim().length > 0 && !email.includes('@')) {
      setFormError('Email inválido.')
      return false
    }
    const cpfDigits = normalizePhone(cpf)
    if (cpfDigits.length > 0 && cpfDigits.length !== 11) {
      setFormError('CPF deve ter 11 dígitos.')
      return false
    }
    setFormError(null)
    return true
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateForm()) return
    mutation.mutate()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="card modal-card modal-card-large" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{isEdit ? 'Editar paciente' : 'Cadastrar paciente'}</h3>
          <button type="button" className="secondary-button" onClick={onClose}>
            Fechar
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="patient-name">
            Nome
          </label>
          <input
            id="patient-name"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label className="field-label" htmlFor="patient-phone">
            Telefone
          </label>
          <input
            id="patient-phone"
            className="field-input"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="(27) 99999-9999"
          />

          <label className="field-label" htmlFor="patient-email">
            Email (opcional)
          </label>
          <input
            id="patient-email"
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="field-label" htmlFor="patient-cpf">
            CPF (opcional)
          </label>
          <input
            id="patient-cpf"
            className="field-input"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            maxLength={14}
          />

          <label className="field-label" htmlFor="patient-notes">
            Informações adicionais (opcional)
          </label>
          <textarea
            id="patient-notes"
            className="field-textarea"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Idade, perfil, personalidade, observações..."
          />

          {(formError || mutation.error) && (
            <p className="error-text">{formError ?? mutation.error?.message}</p>
          )}

          <button type="submit" className="primary-button" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar paciente'}
          </button>
        </form>
      </article>
    </div>
  )
}

function SortableTh({
  label,
  sortKey,
  currentSort,
  onSort,
}: {
  label: string
  sortKey: SortField
  currentSort: { field: SortField; dir: SortDir }
  onSort: (field: SortField) => void
}) {
  const isActive = currentSort.field === sortKey
  const arrow = isActive ? (currentSort.dir === 'asc' ? ' ↑' : ' ↓') : ''
  return (
    <th
      className="th-sortable"
      onClick={() => onSort(sortKey)}
      onKeyDown={(e) => e.key === 'Enter' && onSort(sortKey)}
      role="button"
      tabIndex={0}
    >
      {label}{arrow}
    </th>
  )
}

export function PatientsPage() {
  const [search, setSearch] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editPatient, setEditPatient] = useState<PatientListItem | null>(null)
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'createdAt', dir: 'desc' })

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: fetchPatients,
  })

  const filteredAndSorted = useMemo(() => {
    const list = patientsQuery.data ?? []
    const q = search.trim().toLowerCase()
    const filtered = q
      ? list.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.phoneNumber.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
            (p.email?.toLowerCase().includes(q) ?? false) ||
            (p.cpf?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ?? false)
        )
      : list

    return [...filtered].sort((a, b) => {
      const mult = sort.dir === 'asc' ? 1 : -1
      if (sort.field === 'name') {
        return mult * a.name.localeCompare(b.name, 'pt-BR')
      }
      return mult * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })
  }, [patientsQuery.data, search, sort])

  function handleSort(field: SortField) {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <section className="patients-page">
      <article className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <h3 style={{ margin: 0 }}>Pacientes cadastrados</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              className="field-input"
              placeholder="Pesquisar por nome, telefone, email ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <button type="button" className="primary-button" onClick={() => setCreateModalOpen(true)}>
              Cadastrar paciente
            </button>
          </div>
        </div>

        {patientsQuery.isLoading && <LoadingState message="Carregando pacientes..." />}

        {patientsQuery.isError && (
          <ErrorState
            message={patientsQuery.error.message}
            onRetry={() => {
              void patientsQuery.refetch()
            }}
          />
        )}

        {!patientsQuery.isLoading && !patientsQuery.isError && (patientsQuery.data?.length ?? 0) === 0 && (
          <EmptyState message="Nenhum paciente cadastrado." />
        )}

        {!patientsQuery.isLoading && !patientsQuery.isError && (patientsQuery.data?.length ?? 0) > 0 && (
          <>
            {filteredAndSorted.length === 0 ? (
              <p className="muted-text">Nenhum paciente encontrado para &quot;{search}&quot;.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <SortableTh label="Nome" sortKey="name" currentSort={sort} onSort={handleSort} />
                      <th>Telefone</th>
                      <th>Email</th>
                      <th>CPF</th>
                      <th>Status</th>
                      <SortableTh label="Data cadastro" sortKey="createdAt" currentSort={sort} onSort={handleSort} />
                      <th style={{ width: 80 }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSorted.map((patient) => (
                      <tr key={patient.id}>
                        <td>{patient.name}</td>
                        <td>{patient.phoneNumber}</td>
                        <td>{patient.email || '-'}</td>
                        <td>{patient.cpf ? formatCpf(patient.cpf) : '-'}</td>
                        <td>{patient.status}</td>
                        <td>{new Date(patient.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td>
                          <button
                            type="button"
                            className="secondary-button"
                            style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                            onClick={() => setEditPatient(patient)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </article>

      {createModalOpen && (
        <PatientFormModal
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => setCreateModalOpen(false)}
        />
      )}

      {editPatient && (
        <PatientFormModal
          patient={editPatient}
          onClose={() => setEditPatient(null)}
          onSuccess={() => setEditPatient(null)}
        />
      )}
    </section>
  )
}

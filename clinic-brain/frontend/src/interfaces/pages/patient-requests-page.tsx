import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchPendingPatientRequests,
  fetchRecentPatientRequests,
  reviewPatientRequest,
  subscribeToPatientRequestsStream,
} from '../../application/services/clinic-api'
import { EmptyState, ErrorState, LoadingState } from '../components/feedback-states'

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function PatientRequestsPage() {
  const queryClient = useQueryClient()
  const [reasonByRequest, setReasonByRequest] = useState<Record<string, string>>({})
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)
  const [reviewMessageIsWarning, setReviewMessageIsWarning] = useState(false)

  const requestsQuery = useQuery({
    queryKey: ['patient-requests-pending'],
    queryFn: fetchPendingPatientRequests,
  })

  const recentQuery = useQuery({
    queryKey: ['patient-requests-recent'],
    queryFn: fetchRecentPatientRequests,
  })

  useEffect(() => {
    const unsubscribe = subscribeToPatientRequestsStream(() => {
      void queryClient.invalidateQueries({ queryKey: ['patient-requests-pending'] })
      void queryClient.invalidateQueries({ queryKey: ['patient-requests-recent'] })
    })
    return unsubscribe
  }, [queryClient])

  const reviewMutation = useMutation({
    mutationFn: reviewPatientRequest,
    onSuccess: async (result, variables) => {
      const actionLabel = variables.action === 'APPROVE' ? 'aprovada' : 'rejeitada'
      const defaultMessage = `Solicitação ${actionLabel} com sucesso.`

      setReviewMessage(result.deliveryWarning ?? defaultMessage)
      setReviewMessageIsWarning(Boolean(result.deliveryWarning))

      await queryClient.invalidateQueries({ queryKey: ['patient-requests-pending'] })
      await queryClient.invalidateQueries({ queryKey: ['patient-requests-recent'] })
    },
    onError: (error) => {
      setReviewMessage(error.message)
      setReviewMessageIsWarning(true)
    },
  })

  if (requestsQuery.isLoading) {
    return <LoadingState message="Carregando solicitações pendentes..." />
  }

  if (requestsQuery.isError) {
    return (
      <ErrorState
        message={requestsQuery.error.message}
        onRetry={() => {
          void requestsQuery.refetch()
        }}
      />
    )
  }

  const requests = requestsQuery.data ?? []
  const recent = recentQuery.data ?? []

  if (requests.length === 0 && recent.length === 0) {
    return (
      <section className="reports-grid">
        {reviewMessage ? (
          <article className="card">
            <p className={reviewMessageIsWarning ? 'error-text' : 'success-text'}>{reviewMessage}</p>
          </article>
        ) : null}
        <EmptyState message="Nenhuma solicitação pendente no momento." />
      </section>
    )
  }

  return (
    <section className="reports-grid">
      {reviewMessage ? (
        <article className="card">
          <p className={reviewMessageIsWarning ? 'error-text' : 'success-text'}>{reviewMessage}</p>
        </article>
      ) : null}

      {requests.map((requestItem) => {
        const payload = requestItem.payload
        const isBooking = payload.type === 'BOOK_REQUEST'

        return (
          <article className="card" key={requestItem.id}>
            <h3>{isBooking ? 'Solicitação de novo agendamento' : 'Solicitação de remarcação'}</h3>
            <p className="muted-text">
              Paciente: {requestItem.patient?.name ?? 'Não identificado'} • Telefone:{' '}
              {requestItem.patient?.phoneNumber ?? '-'}
            </p>
            <p className="muted-text">Recebida em: {formatDateTime(requestItem.createdAt)}</p>

            {isBooking ? (
              <p>
                Horário solicitado: {payload.startsAt ? formatDateTime(payload.startsAt) : '-'} até{' '}
                {payload.endsAt ? formatDateTime(payload.endsAt) : '-'}
              </p>
            ) : (
              <>
                <p>
                  Horário atual: {payload.currentStartsAt ? formatDateTime(payload.currentStartsAt) : '-'} até{' '}
                  {payload.currentEndsAt ? formatDateTime(payload.currentEndsAt) : '-'}
                </p>
                <p>
                  Novo horário solicitado: {payload.requestedStartsAt ? formatDateTime(payload.requestedStartsAt) : '-'}{' '}
                  até {payload.requestedEndsAt ? formatDateTime(payload.requestedEndsAt) : '-'}
                </p>
              </>
            )}

            <label className="field-label" htmlFor={`reason-${requestItem.id}`}>
              Motivo (opcional, útil para rejeição)
            </label>
            <input
              id={`reason-${requestItem.id}`}
              className="field-input"
              value={reasonByRequest[requestItem.id] ?? ''}
              onChange={(event) =>
                setReasonByRequest((current) => ({
                  ...current,
                  [requestItem.id]: event.target.value,
                }))
              }
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="primary-button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    id: requestItem.id,
                    action: 'APPROVE',
                    reason: reasonByRequest[requestItem.id],
                  })
                }
              >
                Aprovar
              </button>

              <button
                type="button"
                className="secondary-button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    id: requestItem.id,
                    action: 'REJECT',
                    reason: reasonByRequest[requestItem.id],
                  })
                }
              >
                Rejeitar
              </button>
            </div>
          </article>
        )
      })}

      {recentQuery.data && recentQuery.data.length > 0 ? (
        <>
          <h2 style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>Solicitações recentemente processadas</h2>
          {recentQuery.data.map((item) => {
            const p = item.payload
            const isBooking = p.type === 'BOOK_REQUEST'
            const viaLabel = p.reviewedVia === 'WHATSAPP' ? 'via WhatsApp' : 'via Painel'
            const statusLabel = p.status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'
            return (
              <article className="card" key={item.id}>
                <h3>{isBooking ? 'Agendamento' : 'Remarcação'} — {statusLabel} {viaLabel}</h3>
                <p className="muted-text">
                  Paciente: {item.patient?.name ?? '-'} • {item.payload.reviewedAt ? formatDateTime(item.payload.reviewedAt) : ''}
                </p>
              </article>
            )
          })}
        </>
      ) : null}
    </section>
  )
}

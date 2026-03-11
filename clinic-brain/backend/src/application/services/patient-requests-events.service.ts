import { EventEmitter } from 'node:events'

const patientRequestsEmitter = new EventEmitter()
patientRequestsEmitter.setMaxListeners(50)

export function notifyPatientRequestsUpdated(professionalId: string): void {
  patientRequestsEmitter.emit('updated', professionalId)
}

export function subscribePatientRequestsUpdates(
  professionalId: string,
  callback: () => void,
): () => void {
  const handler = (id: string) => {
    if (id === professionalId) callback()
  }
  patientRequestsEmitter.on('updated', handler)
  return () => patientRequestsEmitter.off('updated', handler)
}

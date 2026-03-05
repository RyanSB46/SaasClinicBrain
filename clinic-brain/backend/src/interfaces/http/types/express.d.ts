declare namespace Express {
  interface Request {
    id?: string
    authUser?: {
      id: string
      email?: string
      role: 'PROFESSIONAL' | 'ADMIN' | 'PATIENT' | 'STAFF'
      professionalId?: string
      patientId?: string
      phoneNumber?: string
    }
    professionalId?: string
    patientId?: string
  }
}

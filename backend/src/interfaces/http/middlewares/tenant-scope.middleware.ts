import { NextFunction, Request, Response } from 'express'

export function tenantScopeMiddleware(request: Request, response: Response, next: NextFunction) {
  if (!request.authUser?.id) {
    return response.status(401).json({ message: 'Usuário não autenticado' })
  }

  if (request.authUser.role === 'PROFESSIONAL') {
    request.professionalId = request.authUser.id
    return next()
  }

  if (request.authUser.role === 'STAFF' && request.authUser.professionalId) {
    request.professionalId = request.authUser.professionalId
    return next()
  }

  return response.status(403).json({ message: 'Acesso permitido apenas para profissionais ou funcionários' })
}

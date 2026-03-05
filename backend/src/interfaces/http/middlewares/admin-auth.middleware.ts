import { NextFunction, Request, Response } from 'express'

export function requireAdmin(request: Request, response: Response, next: NextFunction) {
  if (request.authUser?.role !== 'ADMIN') {
    return response.status(403).json({ message: 'Acesso permitido apenas para administradores' })
  }

  return next()
}

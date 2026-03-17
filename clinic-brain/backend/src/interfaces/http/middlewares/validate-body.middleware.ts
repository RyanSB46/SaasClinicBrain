import { NextFunction, Request, Response } from 'express'
import { ZodSchema } from 'zod'

export function validateBody<T>(schema: ZodSchema<T>) {
  return (request: Request, response: Response, next: NextFunction) => {
    const parsed = schema.safeParse(request.body)

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
      const firstError = errors[0]?.message ?? 'Payload inválido'
      return response.status(400).json({
        message: errors.length > 0 ? firstError : 'Payload inválido',
        errors,
      })
    }

    request.body = parsed.data
    return next()
  }
}

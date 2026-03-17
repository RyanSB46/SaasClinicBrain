import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().trim().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
  phoneNumber: z.string().min(8).max(20).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email é obrigatório').email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').max(128),
})

export type RegisterSchema = z.infer<typeof registerSchema>
export type LoginSchema = z.infer<typeof loginSchema>

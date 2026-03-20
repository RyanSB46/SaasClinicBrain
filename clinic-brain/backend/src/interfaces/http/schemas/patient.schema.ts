import { z } from 'zod'

export const createPatientSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phoneNumber: z.string().trim().min(10, 'Telefone inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cpf: z.string().optional(),
  notes: z.string().trim().optional().or(z.literal('')),
})

export const updatePatientSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
  phoneNumber: z.string().trim().min(10, 'Telefone inválido').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cpf: z.string().optional(),
  notes: z.string().trim().optional().or(z.literal('')),
  status: z.enum(['ATIVO', 'INATIVO']).optional(),
})

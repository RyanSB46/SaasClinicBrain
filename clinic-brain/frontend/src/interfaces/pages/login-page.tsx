import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { login, loginAdmin, loginStaff } from '../../application/services/clinic-api'

type LoginPageProps = {
  onLoginSuccess: (token: string) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loginType, setLoginType] = useState<'PROFESSIONAL' | 'ADMIN' | 'STAFF'>('PROFESSIONAL')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const loginMutation = useMutation<{ accessToken: string }, Error>({
    mutationFn: async () => {
      if (loginType === 'ADMIN') {
        const result = await loginAdmin(email, password)
        return { accessToken: result.accessToken }
      }
      if (loginType === 'STAFF') {
        const result = await loginStaff(email, password)
        return { accessToken: result.accessToken }
      }
      const result = await login(email, password)
      return { accessToken: result.accessToken }
    },
    onSuccess: (result) => {
      onLoginSuccess(result.accessToken)
    },
  })

  const disabled = useMemo(
    () => loginMutation.isPending || email.trim().length === 0 || password.trim().length < 6,
    [email, password, loginMutation.isPending],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)

    if (!email.includes('@')) {
      setLocalError('Informe um email válido.')
      return
    }

    if (password.trim().length < 6) {
      setLocalError('Senha precisa ter ao menos 6 caracteres.')
      return
    }

    loginMutation.mutate()
  }

  return (
    <div className="login-root">
      <form className="card login-card" onSubmit={handleSubmit} autoComplete="off">
        <h1>Clinic Brain</h1>
        <p className="muted-text">
          {loginType === 'ADMIN'
            ? 'Acesse como admin técnico.'
            : loginType === 'STAFF'
              ? 'Acesse como funcionário do profissional.'
              : 'Acesse sua conta profissional para gerenciar agenda e pacientes.'}
        </p>

        <label className="field-label" htmlFor="login-type">
          Tipo de acesso
        </label>
        <select
          id="login-type"
          className="field-input"
          value={loginType}
          onChange={(event) => {
            const nextType = event.target.value as 'PROFESSIONAL' | 'ADMIN' | 'STAFF'
            setLoginType(nextType)
            setEmail('')
            setPassword('')
          }}
        >
          <option value="PROFESSIONAL">Profissional</option>
          <option value="STAFF">Funcionário</option>
          <option value="ADMIN">Admin técnico</option>
        </select>

        <label className="field-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="field-input"
          type="text"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
          placeholder="seu@email.com"
        />

        <label className="field-label" htmlFor="password">
          Senha
        </label>
        <input
          id="password"
          className="field-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          placeholder="••••••••"
        />

        {(localError || loginMutation.error) && (
          <p className="error-text">{localError ?? loginMutation.error?.message ?? 'Falha ao fazer login.'}</p>
        )}

        <button type="submit" className="primary-button" disabled={disabled}>
          {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

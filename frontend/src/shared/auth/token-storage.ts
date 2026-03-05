const ACCESS_TOKEN_KEY = 'clinic_brain_access_token'

/**
 * Usa sessionStorage para que cada aba do navegador mantenha seu próprio login.
 * Assim é possível ter, por exemplo: aba 1 = admin, aba 2 = profissional, aba 3 = portal do paciente.
 */
export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string): void {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
  } catch {
    return
  }
}

export function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    return
  }
}

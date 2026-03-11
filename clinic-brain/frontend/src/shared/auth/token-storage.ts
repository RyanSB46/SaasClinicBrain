const ACCESS_TOKEN_KEY = 'clinic_brain_access_token'

/**
 * Verifica se o token JWT está expirado (claim exp em segundos).
 */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return true
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    if (typeof payload.exp !== 'number') return false
    return payload.exp < Math.floor(Date.now() / 1000)
  } catch {
    return true
  }
}

/**
 * Retorna o token apenas se existir e não estiver expirado.
 * Se expirado, remove do storage e retorna null.
 */
export function getValidAccessToken(): string | null {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return null
    if (isTokenExpired(token)) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

/**
 * Usa localStorage para persistir o token entre abas e reinícios do navegador.
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  } catch {
    return
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    return
  }
}

/** Dispara evento para o app redirecionar ao login quando a sessão expira (401). */
export function notifySessionExpired(): void {
  try {
    window.dispatchEvent(new CustomEvent('auth:session-expired'))
  } catch {
    return
  }
}

const ACCESS_TOKEN_KEY = 'clinic_brain_access_token'

/**
 * Sessão por aba: cada aba tem o seu token, para poder usar duas contas ao mesmo tempo.
 * Migra uma vez do localStorage legado (evita logout ao atualizar quem ainda tinha token antigo).
 */
function migrateLegacyLocalStorageToken(): void {
  try {
    if (sessionStorage.getItem(ACCESS_TOKEN_KEY)) return
    const legacy = localStorage.getItem(ACCESS_TOKEN_KEY)
    if (!legacy) return
    sessionStorage.setItem(ACCESS_TOKEN_KEY, legacy)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

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
    migrateLegacyLocalStorageToken()
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (!token) return null
    if (isTokenExpired(token)) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      return null
    }
    return token
  } catch {
    return null
  }
}

/**
 * Token da aba atual (pode estar expirado). Usa sessionStorage — não é compartilhado entre abas.
 */
export function getAccessToken(): string | null {
  try {
    migrateLegacyLocalStorageToken()
    return sessionStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string): void {
  try {
    migrateLegacyLocalStorageToken()
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  } catch {
    return
  }
}

export function clearAccessToken(): void {
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
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

export type ThemePreference = 'light' | 'dark'

export const CLINIC_BRAIN_THEME_STORAGE_KEY = 'clinic-brain-theme'

export function resolveInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(CLINIC_BRAIN_THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function applyThemePreference(theme: ThemePreference): void {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-theme', theme)
}

export function saveThemePreference(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(CLINIC_BRAIN_THEME_STORAGE_KEY, theme)
}

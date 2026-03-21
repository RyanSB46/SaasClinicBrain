import { useCallback, useEffect, useId, useState } from 'react'
import {
  applyThemePreference,
  CLINIC_BRAIN_THEME_STORAGE_KEY,
  resolveInitialThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../../shared/theme/theme-preference'

function SunIcon() {
  return (
    <svg className="sidebar-theme-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.95" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="sidebar-theme-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        opacity="0.92"
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3a8.44 8.44 0 0 0 2.57 6.32A8.18 8.18 0 0 0 21 14.5z"
      />
    </svg>
  )
}

export function SidebarThemeToggle() {
  const labelId = useId()
  const [theme, setTheme] = useState<ThemePreference>(() => resolveInitialThemePreference())

  const apply = useCallback((next: ThemePreference) => {
    setTheme(next)
    applyThemePreference(next)
    saveThemePreference(next)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CLINIC_BRAIN_THEME_STORAGE_KEY || !event.newValue) return
      if (event.newValue === 'light' || event.newValue === 'dark') {
        setTheme(event.newValue)
        applyThemePreference(event.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <div className="sidebar-theme-block">
      <span className="sidebar-theme-label" id={labelId}>
        Aparência
      </span>
      <div
        className="sidebar-theme-segmented"
        role="group"
        aria-labelledby={labelId}
      >
        <button
          type="button"
          className="sidebar-theme-option"
          aria-pressed={theme === 'light'}
          onClick={() => apply('light')}
        >
          <SunIcon />
          <span>Claro</span>
        </button>
        <button
          type="button"
          className="sidebar-theme-option"
          aria-pressed={theme === 'dark'}
          onClick={() => apply('dark')}
        >
          <MoonIcon />
          <span>Escuro</span>
        </button>
      </div>
    </div>
  )
}

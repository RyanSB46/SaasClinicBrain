import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { LoginPage } from './pages/login-page'
import { DashboardPage } from './pages/dashboard-page'
import { AgendaPage } from './pages/agenda-page'
import { PatientsPage } from './pages/patients-page'
import { SettingsPage } from './pages/settings-page'
import { ReportsPage } from './pages/reports-page'
import { PatientPortalPage } from './pages/patient-portal-page'
import { PatientRequestsPage } from './pages/patient-requests-page'
import { AdminPanelPage } from './pages/admin-panel-page'
import { AnimatedPage } from './components/animated-page'
import { SidebarThemeToggle } from './components/sidebar-theme-toggle'
import { clearAccessToken, getValidAccessToken, setAccessToken } from '../shared/auth/token-storage'
import {
  DEFAULT_PROFESSIONAL_FEATURE_FLAGS,
  fetchSettingsFeatures,
  type ProfessionalFeatureFlags,
} from '../application/services/clinic-api'

type SectionKey = 'dashboard' | 'agenda' | 'patients' | 'reports' | 'requests' | 'settings'

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'patients', label: 'Pacientes' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'requests', label: 'Solicitações' },
  { key: 'settings', label: 'Configurações' },
]

const sectionFeatureMap: Record<SectionKey, keyof ProfessionalFeatureFlags> = {
  dashboard: 'dashboardEnabled',
  agenda: 'agendaEnabled',
  patients: 'patientsEnabled',
  reports: 'reportsEnabled',
  requests: 'requestsEnabled',
  settings: 'settingsEnabled',
}

function getAuthRole(token: string | null): 'PROFESSIONAL' | 'ADMIN' | null {
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      role?: string
    }

    if (payload.role === 'ADMIN') {
      return 'ADMIN'
    }

    if (payload.role === 'STAFF' || payload.role === 'PROFESSIONAL') {
      return 'PROFESSIONAL'
    }

    return null
  } catch {
    return null
  }
}

export function ClinicApp() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/'
  const patientPortalMatch = pathname.match(/^\/p\/([^/]+)$/)

  const [token, setToken] = useState<string | null>(getValidAccessToken())
  const [activeSection, setActiveSection] = useState<SectionKey>('dashboard')
  const authRole = useMemo(() => getAuthRole(token), [token])

  useEffect(() => {
    const handler = () => {
      clearAccessToken()
      setToken(null)
    }
    window.addEventListener('auth:session-expired', handler)
    return () => window.removeEventListener('auth:session-expired', handler)
  }, [])

  const featuresQuery = useQuery({
    queryKey: ['settings-features'],
    queryFn: fetchSettingsFeatures,
    enabled: Boolean(token) && authRole === 'PROFESSIONAL',
  })

  const featureFlags = featuresQuery.data ?? DEFAULT_PROFESSIONAL_FEATURE_FLAGS

  const availableSections = useMemo(
    () => sections.filter((section) => featureFlags[sectionFeatureMap[section.key]]),
    [featureFlags],
  )

  useEffect(() => {
    if (authRole !== 'PROFESSIONAL') {
      return
    }

    if (availableSections.length === 0) {
      return
    }

    if (!availableSections.some((section) => section.key === activeSection)) {
      setActiveSection(availableSections[0].key)
    }
  }, [activeSection, authRole, availableSections])

  const title = useMemo(() => {
    const current = availableSections.find((section) => section.key === activeSection)
    return current?.label ?? 'Dashboard'
  }, [activeSection, availableSections])

  if (patientPortalMatch) {
    return <PatientPortalPage professionalSlug={decodeURIComponent(patientPortalMatch[1])} />
  }

  if (!token) {
    return (
      <LoginPage
        onLoginSuccess={(accessToken) => {
          setAccessToken(accessToken)
          setToken(accessToken)
        }}
      />
    )
  }

  if (authRole === 'ADMIN') {
    return (
      <div className="layout-root">
        <aside className="sidebar">
          <h1 className="sidebar-title">Clinic Brain</h1>
          <p className="sidebar-subtitle">Painel admin técnico</p>

          <div className="sidebar-footer">
            <SidebarThemeToggle />
            <button
              type="button"
              className="logout-button"
              onClick={() => {
                clearAccessToken()
                setToken(null)
              }}
            >
              Sair
            </button>
          </div>
        </aside>

        <main className="content-area">
          <header className="content-header">
            <h2>Gerenciamento de profissionais</h2>
          </header>

          <AnimatedPage key="admin">
            <AdminPanelPage />
          </AnimatedPage>
        </main>
      </div>
    )
  }

  return (
    <div className="layout-root">
      <aside className="sidebar">
        <h1 className="sidebar-title">Clinic Brain</h1>
        <p className="sidebar-subtitle">Painel profissional</p>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {availableSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={section.key === activeSection ? 'nav-item nav-item-active' : 'nav-item'}
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <SidebarThemeToggle />
          <button
            type="button"
            className="logout-button"
            onClick={() => {
              clearAccessToken()
              setToken(null)
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="content-area">
        <header className="content-header">
          <h2>{title}</h2>
        </header>

        <AnimatePresence mode="wait">
          {activeSection === 'dashboard' && (
            <AnimatedPage key="dashboard">
              <DashboardPage />
            </AnimatedPage>
          )}
          {activeSection === 'agenda' && (
            <AnimatedPage key="agenda">
              <AgendaPage />
            </AnimatedPage>
          )}
          {activeSection === 'patients' && (
            <AnimatedPage key="patients">
              <PatientsPage />
            </AnimatedPage>
          )}
          {activeSection === 'reports' && (
            <AnimatedPage key="reports">
              <ReportsPage />
            </AnimatedPage>
          )}
          {activeSection === 'requests' && (
            <AnimatedPage key="requests">
              <PatientRequestsPage />
            </AnimatedPage>
          )}
          {activeSection === 'settings' && (
            <AnimatedPage key="settings">
              <SettingsPage />
            </AnimatedPage>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

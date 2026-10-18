import { useEffect, type ReactNode } from 'react'
import { authApi } from './api/endpoints'
import { Brand } from './components/layout/AppShell'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ToastProvider } from './components/ui'
import { AccountPage } from './features/account/AccountPage'
import { AdminPage } from './features/admin/AdminPage'
import { LoginPage, RegisterPage, ResetConfirmPage, ResetPage, VerifyEmailPage, WelcomePage } from './features/auth/AuthPages'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DiaryPage } from './features/diary/DiaryPage'
import { DogProfilePage } from './features/dogs/DogProfilePage'
import { NewDogPage } from './features/dogs/NewDogPage'
import { ExerciseDetailPage } from './features/physio/ExerciseDetailPage'
import { ExerciseEditorPage } from './features/physio/ExerciseEditorPage'
import { ExercisesPage } from './features/physio/ExercisesPage'
import { HistoryPage } from './features/physio/HistoryPage'
import { PlanDetailPage } from './features/physio/PlanDetailPage'
import { PlanEditorPage } from './features/physio/PlanEditorPage'
import { PlansPage } from './features/physio/PlansPage'
import { SessionPage } from './features/physio/SessionPage'
import { AppStoreProvider, useStore } from './store/AppStore'

// Hash-Routing für Vorschau-Builds ohne Server-Rewrite; Standard ist History-Routing
// (STRATO: .htaccess-Fallback auf index.html, siehe docs/03-architektur.md).
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

/** Prüft beim Start, ob noch eine gültige Server-Sitzung besteht. */
function SessionBoot() {
  const { state, dispatch } = useStore()
  useEffect(() => {
    if (!state.booting) return
    authApi
      .me()
      .then((session) => dispatch({ type: 'liveSession', ...session }))
      .catch(() => dispatch({ type: 'bootDone' }))
  }, [state.booting, dispatch])
  return null
}

function Splash() {
  return (
    <div className="flex min-h-dvh animate-fade items-center justify-center" aria-busy="true" aria-label="Wird geladen">
      <Brand />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useStore()
  if (state.booting) return <Splash />
  return state.authed ? children : <Navigate to="/welcome" replace />
}

/** Ohne Hundeprofil geht es direkt ins Onboarding. */
function RequireDog({ children }: { children: ReactNode }) {
  const { state } = useStore()
  return state.dogs.length > 0 ? children : <NewDogPage onboarding />
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { state } = useStore()
  if (state.booting) return <Splash />
  return state.authed ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AppStoreProvider>
      <ToastProvider>
        <Router basename={import.meta.env.VITE_ROUTER === 'hash' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
          <SessionBoot />
          <Routes>
            <Route path="/welcome" element={<PublicOnly><WelcomePage /></PublicOnly>} />
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
            <Route path="/reset" element={<PublicOnly><ResetPage /></PublicOnly>} />
            <Route path="/reset/confirm" element={<ResetConfirmPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route path="/training/session/:planId" element={<RequireAuth><RequireDog><SessionPage /></RequireDog></RequireAuth>} />

            <Route element={<RequireAuth><RequireDog><AppShell /></RequireDog></RequireAuth>}>
              <Route index element={<DashboardPage />} />
              <Route path="training" element={<PlansPage />} />
              <Route path="training/plans/new" element={<PlanEditorPage />} />
              <Route path="training/plans/:id" element={<PlanDetailPage />} />
              <Route path="training/plans/:id/edit" element={<PlanEditorPage />} />
              <Route path="training/exercises" element={<ExercisesPage />} />
              <Route path="training/exercises/new" element={<ExerciseEditorPage />} />
              <Route path="training/exercises/:id" element={<ExerciseDetailPage />} />
              <Route path="training/exercises/:id/edit" element={<ExerciseEditorPage />} />
              <Route path="training/history" element={<HistoryPage />} />
              <Route path="diary" element={<DiaryPage />} />
              <Route path="dog" element={<DogProfilePage />} />
              <Route path="dogs/new" element={<NewDogPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="admin" element={<AdminPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AppStoreProvider>
  )
}

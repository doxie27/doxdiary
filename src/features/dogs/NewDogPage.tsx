import { useNavigate } from 'react-router-dom'
import { Brand } from '../../components/layout/AppShell'
import { PageHeader } from '../../components/layout/PageHeader'
import { useToast } from '../../components/ui'
import { uid } from '../../lib/cn'
import { useStore } from '../../store/AppStore'
import { useDogActions } from '../../store/useDogActions'
import { DogForm, emptyDog } from './DogForm'

/** Hund anlegen – als normale Seite oder als Onboarding direkt nach der Registrierung. */
export function NewDogPage({ onboarding = false }: { onboarding?: boolean }) {
  const { state } = useStore()
  const { save } = useDogActions()
  const navigate = useNavigate()
  const toast = useToast()
  return (
    <div className={onboarding ? 'mx-auto min-h-dvh max-w-xl' : undefined}>
      {onboarding ? (
        <header className="px-5 pb-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <Brand small />
          <p className="mt-8 text-sm font-semibold text-ink-3">Willkommen, {state.user.firstName}!</p>
          <h1 className="font-display mt-1 text-[2rem] leading-tight font-medium">Wer ist dein Hund?</h1>
          <p className="mt-2 text-ink-3">Leg das erste Profil an – du kannst alles später noch ändern.</p>
        </header>
      ) : (
        <PageHeader title="Neuer Hund" eyebrow="Profil anlegen" back />
      )}
      <div className="px-5 pb-10 lg:px-8">
        <DogForm
          initial={emptyDog(uid('dog'))}
          submitLabel="Profil anlegen"
          onSubmit={async (d, photo) => {
            const saved = await save(d, photo)
            toast(`Willkommen, ${saved.name}!`)
            navigate(onboarding ? '/' : '/dog', { replace: true })
          }}
        />
      </div>
    </div>
  )
}

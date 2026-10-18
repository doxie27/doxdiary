import { MailCheck, X } from 'lucide-react'
import { useState } from 'react'
import { meApi } from '../../api/endpoints'
import { useStore } from '../../store/AppStore'
import { useToast } from '../ui'

/** Dezenter Hinweis, solange die E-Mail-Adresse nicht bestätigt ist. */
export function VerifyBanner() {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [hidden, setHidden] = useState(false)
  const [busy, setBusy] = useState(false)
  if (state.mode !== 'live' || state.user.emailVerified !== false || hidden) return null

  const resend = async () => {
    setBusy(true)
    try {
      const r = await meApi.resendVerification()
      if (r.alreadyVerified) dispatch({ type: 'updateUser', user: { ...state.user, emailVerified: true } })
      else toast('Bestätigungsmail gesendet')
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-5 mt-[max(1rem,env(safe-area-inset-top))] flex animate-rise items-start gap-3 rounded-2xl border border-honey-400/40 bg-honey-100/70 p-3.5 lg:mx-8 lg:mt-6">
      <MailCheck className="mt-0.5 size-5 shrink-0 text-honey-600" />
      <div className="min-w-0 flex-1 text-sm text-ink-2">
        <p>
          Bitte bestätige deine E-Mail-Adresse <span className="font-semibold">{state.user.email}</span> über den Link in unserer Mail.
        </p>
        <button onClick={resend} disabled={busy} className="mt-1 font-semibold text-honey-600 underline underline-offset-2 disabled:opacity-50">
          Mail erneut senden
        </button>
      </div>
      <button onClick={() => setHidden(true)} aria-label="Hinweis ausblenden" className="-m-1 p-1 text-ink-3">
        <X className="size-4" />
      </button>
    </div>
  )
}

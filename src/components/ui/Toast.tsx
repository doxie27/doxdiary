import { CircleCheck } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const Ctx = createContext<(msg: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null)
  const show = useCallback((text: string) => {
    const key = Date.now()
    setMsg({ text, key })
    setTimeout(() => setMsg((m) => (m?.key === key ? null : m)), 2600)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
        {msg && (
          <div key={msg.key} className="flex animate-rise items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-float">
            <CircleCheck className="size-4 text-sage-300" />
            {msg.text}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)

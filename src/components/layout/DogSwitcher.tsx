import { Check, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ageFrom } from '../../lib/date'
import { cn } from '../../lib/cn'
import { useStore } from '../../store/AppStore'
import { Button, DogPortrait, Sheet } from '../ui'

export function DogSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch, dog } = useStore()
  const navigate = useNavigate()
  return (
    <Sheet open={open} onClose={onClose} title="Deine Hunde">
      <div className="grid grid-cols-1 gap-2.5">
        {state.dogs.map((d) => {
          const age = ageFrom(d.birthDate)
          const active = d.id === dog.id
          return (
            <button
              key={d.id}
              onClick={() => {
                dispatch({ type: 'selectDog', id: d.id })
                onClose()
              }}
              className={cn('flex items-center gap-4 rounded-2xl border p-3 text-left transition active:scale-[0.98]', active ? 'border-sage-400 bg-sage-50' : 'border-line bg-surface hover:border-line-strong')}
            >
              <DogPortrait dog={d} size={56} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg">{d.name}</div>
                <div className="text-sm text-ink-3">
                  {d.breed} · {age.years} Jahre
                </div>
              </div>
              {active && (
                <span className="flex size-7 animate-pop items-center justify-center rounded-full bg-sage-600 text-white">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
        <Button
          variant="secondary"
          icon={Plus}
          block
          className="mt-1"
          onClick={() => {
            onClose()
            navigate('/dogs/new')
          }}
        >
          Hund hinzufügen
        </Button>
      </div>
    </Sheet>
  )
}

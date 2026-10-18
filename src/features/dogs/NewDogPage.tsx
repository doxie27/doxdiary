import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { useToast } from '../../components/ui'
import { uid } from '../../lib/cn'
import { useStore } from '../../store/AppStore'
import { DogForm, emptyDog } from './DogForm'

export function NewDogPage() {
  const { dispatch } = useStore()
  const navigate = useNavigate()
  const toast = useToast()
  return (
    <div>
      <PageHeader title="Neuer Hund" eyebrow="Profil anlegen" back />
      <div className="px-5 pb-10 lg:px-8">
        <DogForm
          initial={emptyDog(uid('dog'))}
          submitLabel="Profil anlegen"
          onSubmit={(d) => {
            dispatch({ type: 'upsertDog', dog: d })
            toast(`Willkommen, ${d.name}!`)
            navigate('/dog')
          }}
        />
      </div>
    </div>
  )
}

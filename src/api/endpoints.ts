import type { Dog, User } from '../data/types'
import { API_BASE, api } from './client'

/** JSON-Formen der API (siehe api/src/Repositories/*::present) */
interface ApiUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: User['role']
  createdAt: string
}

interface ApiDog extends Omit<Dog, 'photoUrl'> {
  photoMediaId: string | null
  updatedAt: string
}

export interface SessionData {
  user: User
  dogs: Dog[]
}

const toUser = (u: ApiUser): User => ({ ...u })

export const toDog = (d: ApiDog & { access?: unknown }): Dog => {
  const { photoMediaId, updatedAt: _u, access: _a, ...rest } = d
  return { ...rest, photoUrl: photoMediaId ? `${API_BASE}/media/${photoMediaId}` : null }
}

const toSession = (r: { user: ApiUser; dogs: ApiDog[] }): SessionData => ({ user: toUser(r.user), dogs: r.dogs.map(toDog) })

export type DogInput = Pick<Dog, 'name' | 'breed' | 'sex' | 'birthDate' | 'weightKg' | 'neutered' | 'healthNotes' | 'bio' | 'accent'>

const dogInput = (d: Dog): DogInput => ({
  name: d.name,
  breed: d.breed,
  sex: d.sex,
  birthDate: d.birthDate,
  weightKg: d.weightKg,
  neutered: d.neutered,
  healthNotes: d.healthNotes,
  bio: d.bio,
  accent: d.accent,
})

export const authApi = {
  me: async () => toSession(await api('GET', '/me')),
  login: async (email: string, password: string) => toSession(await api('POST', '/auth/login', { email, password })),
  register: async (firstName: string, email: string, password: string, privacyAccepted: boolean) =>
    toSession(await api('POST', '/auth/register', { firstName, email, password, privacyAccepted })),
  logout: () => api<null>('POST', '/auth/logout'),
  forgot: (email: string) => api('POST', '/auth/password/forgot', { email }),
  reset: (token: string, password: string) => api<null>('POST', '/auth/password/reset', { token, password }),
}

export const meApi = {
  update: async (firstName: string, lastName: string) => toUser((await api<{ user: ApiUser }>('PATCH', '/me', { firstName, lastName })).user),
  changePassword: (currentPassword: string, newPassword: string) => api('POST', '/me/password', { currentPassword, newPassword }),
  export: () => api<unknown>('GET', '/me/export'),
  delete: (password: string) => api<null>('POST', '/me/delete', { password }),
}

export const dogApi = {
  create: async (d: Dog) => toDog((await api<{ dog: ApiDog }>('POST', '/dogs', dogInput(d))).dog),
  update: async (d: Dog) => toDog((await api<{ dog: ApiDog }>('PATCH', `/dogs/${d.id}`, dogInput(d))).dog),
  remove: (id: string) => api<null>('DELETE', `/dogs/${id}`),
  uploadPhoto: async (id: string, file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return toDog((await api<{ dog: ApiDog }>('POST', `/dogs/${id}/photo`, form)).dog)
  },
  deletePhoto: async (id: string) => toDog((await api<{ dog: ApiDog }>('DELETE', `/dogs/${id}/photo`)).dog),
}

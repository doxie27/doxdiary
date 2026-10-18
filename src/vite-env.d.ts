/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ROUTER?: 'hash' | 'history'
  /** Abweichende API-Adresse, Standard: <base>/api/v1 */
  readonly VITE_API_URL?: string
}

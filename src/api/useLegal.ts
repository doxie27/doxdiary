import { useEffect, useState } from 'react'
import { metaApi, type LegalLinks } from './endpoints'

let cache: LegalLinks | null = null

/** Mitgelieferte Seiten (public/impressum.html, public/datenschutz.html) */
const builtIn: LegalLinks = {
  imprintUrl: `${import.meta.env.BASE_URL}impressum.html`,
  privacyUrl: `${import.meta.env.BASE_URL}datenschutz.html`,
}

/** Links zu Impressum und Datenschutz: aus der Server-Konfiguration, sonst die mitgelieferten Seiten. */
export function useLegal(): LegalLinks {
  const [legal, setLegal] = useState<LegalLinks>(cache ?? builtIn)
  useEffect(() => {
    if (cache) return
    metaApi
      .get()
      .then((r) => {
        cache = {
          imprintUrl: r.legal.imprintUrl ?? builtIn.imprintUrl,
          privacyUrl: r.legal.privacyUrl ?? builtIn.privacyUrl,
        }
        setLegal(cache)
      })
      .catch(() => null)
  }, [])
  return legal
}

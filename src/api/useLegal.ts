import { useEffect, useState } from 'react'
import { metaApi, type LegalLinks } from './endpoints'

let cache: LegalLinks | null = null

/** Links zu Impressum und Datenschutz aus der Server-Konfiguration (fehlen im Demo-Modus). */
export function useLegal(): LegalLinks {
  const [legal, setLegal] = useState<LegalLinks>(cache ?? { imprintUrl: null, privacyUrl: null })
  useEffect(() => {
    if (cache) return
    metaApi
      .get()
      .then((r) => {
        cache = r.legal
        setLegal(r.legal)
      })
      .catch(() => null)
  }, [])
  return legal
}

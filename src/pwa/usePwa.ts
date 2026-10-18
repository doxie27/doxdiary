import { useEffect, useState, useSyncExternalStore } from 'react'
import { pwa } from './register'

export function usePwa() {
  const updateReady = useSyncExternalStore(pwa.subscribe, pwa.updateReady)
  const canInstall = useSyncExternalStore(pwa.subscribe, pwa.canInstall)
  return { updateReady, canInstall, standalone: pwa.isStandalone(), ios: pwa.isIos() }
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

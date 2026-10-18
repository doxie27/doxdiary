import { useOutletContext } from 'react-router-dom'

export const useShell = () => useOutletContext<{ openSwitcher: () => void }>()

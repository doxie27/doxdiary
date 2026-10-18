/**
 * Dezenter Signalton (Web Audio, ohne Audiodateien). Browser erlauben Ton erst
 * nach einer Nutzeraktion – unlock() beim Start des Trainings aufrufen.
 */
const KEY = 'doxie-diary.sound'
let ctx: AudioContext | null = null

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* ignorieren */
  }
}

export function unlockSound() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

/** Zwei weiche Töne – „ding-dong“ */
export function chime() {
  if (!ctx || !soundEnabled()) return
  const now = ctx.currentTime
  for (const [i, freq] of [880, 660].entries()) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.18
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.55)
  }
}

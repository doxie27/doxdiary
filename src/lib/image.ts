/**
 * Verkleinert ein Bild clientseitig (nur Prototyp – speichert als Data-URL).
 * In Phase 2 wird die Datei per multipart an die API geschickt, dort
 * validiert (MIME, Größe, Re-Encoding) und außerhalb des Webroots gespeichert.
 */
export async function fileToDataUrl(file: File, maxSize = 720): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Bitte ein Bild auswählen.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'))
      i.src = url
    })
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Ohne fetch(), damit die Content-Security-Policy kein data: für connect-src braucht. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const [head, b64] = dataUrl.split(',', 2)
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? 'application/octet-stream'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

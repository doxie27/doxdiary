import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Plugin } from 'vite'

/**
 * Erzeugt sw.js aus sw-template.js mit der Liste aller Build-Dateien.
 * Version = Hash über die Dateinamen → jedes Release erzeugt einen neuen Cache.
 */
export function serviceWorker(): Plugin {
  return {
    name: 'doxie-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'))
      const statics = ['index.html', 'favicon.svg', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png']
      // PDF-Baustein (Bibliothek + Schriften) nicht vorab laden – erst bei Gebrauch (Datenvolumen)
      const lazy = (f: string) => /^assets\/pdf-/.test(f) || f.endsWith('.ttf')
      const precache = [...new Set([...statics, ...files.filter((f) => !f.endsWith('.html') && !lazy(f))])]
      const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 12)
      const template = readFileSync(new URL('./sw-template.js', import.meta.url), 'utf8')
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__PRECACHE__', JSON.stringify(precache)),
      })
    },
  }
}

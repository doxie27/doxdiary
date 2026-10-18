import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// VITE_BASE=/doxie/ für Unterverzeichnisse auf STRATO.
// Modus „showcase“ (npm run build:preview): relative Pfade + Hash-Routing für Vorschau-Hosting.
export default defineConfig(({ mode }) => ({
  base: mode === 'showcase' ? './' : (process.env.VITE_BASE ?? '/'),
  plugins: [react(), tailwindcss()],
  server: {
    // Phase 2: lokale PHP-API (php -S localhost:8080 -t api/public)
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'node',
  },
}))

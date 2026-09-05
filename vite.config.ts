import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      /**
       * All frontend /api/* calls are proxied to the backend on port 8000.
       *
       * The rewrite strips the leading /api so:
       *   /api/health              → backend /health              ✓
       *   /api/reports/foo         → backend /reports/foo         ✓
       *   /api/metrics/summary     → backend /metrics/summary     ✓
       *   /api/models              → backend /models              ✓
       *   /api/explain/model       → backend /explain/model       ✓
       *   /api/api/surface/date    → backend /api/surface/date    ✓
       *
       * Note: /chat is called directly to http://127.0.0.1:8000 (CORS open).
       */
      '/api': {
        target:       'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite:      (path: string) => path.replace(/^\/api/, ''),
      },
    },
  },
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// diagram-library.js touches `document`/`window` only inside methods
// (never at module load time), so it's safe under Vite's default
// client-side rendering. No SSR here on purpose — see README.md
// for why Next.js's SSR would need extra guarding for this library.
export default defineConfig({
  plugins: [react()],
  // Monaco's own workers (editor.worker, ts.worker) are ES modules —
  // without this Vite dev-serves them as classic scripts and they fail
  // to import their internal dependencies.
  worker: {
    format: 'es',
  },
});

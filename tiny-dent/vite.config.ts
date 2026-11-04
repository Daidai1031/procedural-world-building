import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// TECH-02, TECH-05: an independent build served at the shared site's /game/ path.
export default defineConfig({
  plugins: [react()],
  base: '/game/',
})

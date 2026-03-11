import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: true, // Permite acesso pelo celular na mesma rede (0.0.0.0)
    port: 5173,
  },
})

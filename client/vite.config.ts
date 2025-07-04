import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig((config) => {
  const env = loadEnv(config.mode, process.cwd(), '')
  console.info(env.ALLOWED_HOSTS.split(','))
  return {
    plugins: [react()],
    server: {
      // cors: false, //{ origin: '*' },
      allowedHosts: true,
    },
  }
})

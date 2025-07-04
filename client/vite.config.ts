import ChildProcess from 'node:child_process'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const commitSha =
  ChildProcess.execSync('git rev-parse --short HEAD').toString().trim() ||
  process.env.COMMIT_SHA

export default defineConfig((_) => ({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(commitSha),
  },
}))

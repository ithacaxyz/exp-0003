export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD
    ? 'https://exp-0003-server.evm.workers.dev'
    : 'http://localhost:6900')

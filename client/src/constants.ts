export const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.PROD
    ? 'https://offline-server-example.evm.workers.dev'
    : 'http://localhost:6900')

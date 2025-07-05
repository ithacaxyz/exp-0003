/// <reference types="vite/client" />

declare const __APP_VERSION__: string

interface Environment {
  readonly COMMIT_SHA: string
  readonly WORKERS_CI_COMMIT_SHA: string
}

interface ImportMetaEnv extends Environment {
  readonly VITE_SERVER_URL: string
  readonly VITE_DIALOG_RENDERER: 'popup' | 'iframe'
  readonly VITE_ENVIRONMENT: 'development' | 'production'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

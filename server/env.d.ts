interface Environment {
  readonly PORT: string
  readonly ENVIRONMENT: 'development' | 'production'
  readonly ADMIN_USERNAME: string
  readonly ADMIN_PASSWORD: string
  readonly LOGGING: 'verbose' | 'normal' | ''
}

declare namespace NodeJS {
  interface ProcessEnv extends Environment {}
}

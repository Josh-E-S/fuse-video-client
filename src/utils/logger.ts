type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const MIN_LEVEL: LogLevel =
  process.env.NODE_ENV === 'production' ? 'warn' : 'debug'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL]
}

function formatPrefix(scope: string): string {
  return `[Fuse:${scope}]`
}

function createLogger(scope: string) {
  const prefix = formatPrefix(scope)

  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (!shouldLog('debug')) return
      if (data) console.debug(prefix, message, data)
      else console.debug(prefix, message)
    },

    info(message: string, data?: Record<string, unknown>) {
      if (!shouldLog('info')) return
      if (data) console.info(prefix, message, data)
      else console.info(prefix, message)
    },

    warn(message: string, data?: Record<string, unknown>) {
      if (!shouldLog('warn')) return
      if (data) console.warn(prefix, message, data)
      else console.warn(prefix, message)
    },

    error(message: string, error?: unknown, data?: Record<string, unknown>) {
      if (!shouldLog('error')) return
      console.error(prefix, message, error ?? '', data ?? '')
    },
  }
}

export const log = {
  pexrtc: createLogger('pexrtc'),
  registration: createLogger('registration'),
  media: createLogger('media'),
  transcription: createLogger('transcription'),
  ui: createLogger('ui'),
  api: createLogger('api'),
  pip: createLogger('pip'),
}

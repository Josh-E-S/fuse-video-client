import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: 'https://0b1dba3d1ea0d5d561ca67bd55082d1a@o4511236425646080.ingest.us.sentry.io/4511236430299136',
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

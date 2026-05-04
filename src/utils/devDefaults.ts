// src/utils/devDefaults.ts
//
// Build-time-guarded reads of NEXT_PUBLIC_DEV_* env vars used to pre-fill
// the Setup Wizard during local development. The `process.env.NODE_ENV`
// literal is replaced at build time by Next/webpack, so in production
// builds the entire object literal becomes `{}` and the NEXT_PUBLIC_DEV_*
// reads are eliminated before the bundle is emitted. Verified by
// inspecting the production output.

type DevDefaults = {
  nodeDomain?: string
  displayName?: string
  regAlias?: string
  regUsername?: string
  regPassword?: string
  otjClientId?: string
  otjClientSecret?: string
  pexipCustomerId?: string
  googleDomain?: string
}

export const devDefaults: DevDefaults =
  process.env.NODE_ENV !== 'production'
    ? {
        nodeDomain: process.env.NEXT_PUBLIC_DEV_NODE_DOMAIN,
        displayName: process.env.NEXT_PUBLIC_DEV_DISPLAY_NAME,
        regAlias: process.env.NEXT_PUBLIC_DEV_REG_ALIAS,
        regUsername: process.env.NEXT_PUBLIC_DEV_REG_USERNAME,
        regPassword: process.env.NEXT_PUBLIC_DEV_REG_PASSWORD,
        otjClientId: process.env.NEXT_PUBLIC_DEV_OTJ_CLIENT_ID,
        otjClientSecret: process.env.NEXT_PUBLIC_DEV_OTJ_CLIENT_SECRET,
        pexipCustomerId: process.env.NEXT_PUBLIC_DEV_PEXIP_CUSTOMER_ID,
        googleDomain: process.env.NEXT_PUBLIC_DEV_GOOGLE_DOMAIN,
      }
    : {}

import type { H3Event } from 'h3'
import { defineEventHandler, toWebRequest } from 'h3'

import type { AuthConfig, Awaitable, Session } from '@auth/core/types'
import { Auth } from '@auth/core'

import { defu } from 'defu'

import type { AuthUserConfig, ResolvedAuthConfig } from './config'
import { resolveAuthConfig } from './config'

import { useRuntimeConfig } from '#imports'

export type AuthPluginConfig = AuthUserConfig | ((event: H3Event) => Awaitable<AuthUserConfig>)

export function defineAuthConfig(config: AuthPluginConfig): AuthPluginConfig {
  return config
}

async function useAuthMiddleware(event: H3Event, config: AuthPluginConfig) {
  const runtimeConfig = useRuntimeConfig()

  const userConfig = typeof config === 'function' ? await config(event) : config

  const options = resolveAuthConfig(defu(userConfig, {
    secret: runtimeConfig?.session?.password,
    pages: runtimeConfig.auth?.pages,
    cookies: {
      sessionToken: {
        name: runtimeConfig?.session?.name || `__session`,
        options: runtimeConfig?.session?.cookie as any,
      },
    },
  }))

  // delete options.raw
  // options.trustHost ??= true
  // delete options.skipCSRFCheck

  // Automatically resolve provider options from runtime config
  options.providers = options.providers.map((provider) => {
    const finalProvider = typeof provider === 'function' ? provider({}) : provider
    if (finalProvider.type === 'oauth' || finalProvider.type === 'oidc') {
      const options = (runtimeConfig.oauth as any)?.[finalProvider.id]
      if (options) {
        if (options.clientId) {
          finalProvider.clientId ??= options?.clientId
        }
        if (options.clientSecret) {
          finalProvider.clientSecret ??= options?.clientSecret
        }
        if (finalProvider.type === 'oidc' && options.issuer) {
          finalProvider.issuer ??= options.issuer
        }
      }
    }
    else if (finalProvider.type === 'email') {
      const options = runtimeConfig.auth?.email
      if (options) {
        if (options.from) {
          finalProvider.from ??= options?.from
        }
        if (options.server) {
          finalProvider.server ??= options?.server
        }
      }
    }
    return finalProvider
  })

  if (process.dev) {
    if (!options.secret) {
      console.warn('[Nuxt-Auth]: No secret provided for auth, use NUXT_SESSION_PASSWORD env variable, this error will be fatal in production')
      options.secret = 'secret'
    }
  }

  ;(event.context as any).$auth = {
    options,
  }
}

export function defineAuthMiddleware(auth: AuthPluginConfig) {
  return defineEventHandler(async (event) => {
    await useAuthMiddleware(event, auth)
    // await getServerSession(event)
  })
}

export async function getSession(event: H3Event): Promise<Session | null>
export async function getSession(event: H3Event, options?: AuthConfig): Promise<Session | null>
export async function getSession(event: H3Event, options?: AuthConfig): Promise<Session | null> {
  options ??= event.context.$auth?.options

  if (!options) {
    if (process.dev) {
      console.error('[Nuxt-Auth]: Missing authPlugin, this error will not be shown in production, getSession will return null instead.')
    }

    return null
  }

  const request = toWebRequest(event)

  const url = new URL('/api/auth/session', request.url)

  const response = await Auth(new Request(url, { headers: request.headers }), options as Omit<AuthConfig, 'raw'>)

  const { status = 200 } = response

  const data = await response.json()

  if (!data || !Object.keys(data).length) {
    return null
  }

  if (status === 200) {
    return data
  }

  throw new Error(data.message)
}

export async function getServerSession(event: H3Event): Promise<Session | null>
export async function getServerSession(event: H3Event, options?: AuthConfig): Promise<Session | null>
export async function getServerSession(event: H3Event, options?: AuthConfig): Promise<Session | null> {
  let session = event.context.$authSession

  if (typeof session === 'undefined') {
    session = await getSession(event, options)
    event.context.$authSession = session
  }

  return session
}

declare module 'h3' {
  interface H3EventContext {
    /**
     * The global {@link PrismaClient} instance.
     */
    readonly $auth?: {
      readonly options: ResolvedAuthConfig
    }
  }
}

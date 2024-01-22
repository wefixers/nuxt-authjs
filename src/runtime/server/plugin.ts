import type { H3Event } from 'h3'
import type { NitroApp } from 'nitropack'
import type { AuthConfig, Awaitable, User } from '@auth/core/types'

import { Auth } from '@auth/core'

import type { AuthUserConfig, ResolvedAuthConfig } from './config'
import { defineAuthConfig } from './config'

import { useRuntimeConfig } from '#imports'

export type AuthPluginConfig<TUser> = AuthUserConfig<TUser> | ((event: H3Event) => Awaitable<AuthUserConfig<TUser>>)

export type inferUser<T> = T extends AuthPlugin<infer U> ? U : never
export interface AuthPlugin<_TUser> {
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

export function authPlugin<TUser = User>(config: AuthPluginConfig<TUser>) {
  const plugin: AuthPlugin<TUser> = (nitro: NitroApp) => {
    nitro.hooks.hook('request', async (event) => {
      const runtimeConfig = useRuntimeConfig()

      const userConfig = typeof config === 'function' ? await config(event) : config
      const options = defineAuthConfig(userConfig, {
        secret: runtimeConfig?.session?.password,
        cookies: {
          sessionToken: {
            name: runtimeConfig?.session?.name || `__session`,
            options: runtimeConfig?.session?.cookie as any,
          },
        },
      })

      // delete options.raw
      // options.trustHost ??= true
      // authOptions.skipCSRFCheck = skipCSRFCheck

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
    })
  }

  return plugin
}

export async function getSession(event: H3Event): Promise<any>
export async function getSession(event: H3Event, options?: AuthConfig): Promise<any> {
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

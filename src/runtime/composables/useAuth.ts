import type { ComputedRef, Ref } from 'vue'
import type { BuiltInProviderType } from '@auth/core/providers'

import { appendResponseHeader } from 'h3'

import type { NuxtApp } from '#app/nuxt'
import type { Session } from '#auth'

import { computed, navigateTo, useRequestEvent, useRequestHeaders, useState } from '#imports'

type LiteralUnion<T extends U, U = string> = T | (U & Record<never, never>)

export type SupportedProviders = LiteralUnion<BuiltInProviderType> | undefined

/**
 * Represents a session status.
 *
 * - `loading`: The session is currently being fetched, equivalent to `if (loading.value) {}`.
 * - `authenticated`: The session was initialized and the user is authenticated, equivalent to `if (data.value) {}`.
 * - `unauthenticated`: The session was initialized, but the user is not authenticated, equivalent to `if (!data.value) {}`.
 */
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

/**
 * ### Note
 *
 * Try to avoid manipulate the auth state directly, the auth rely on this object to be properly set.
 */
export interface Auth {
  /**
   * The session data.
   *
   * - `undefined`: The session was not yet initialized.
   * - `null`: The session was initialized, but the user is not authenticated.
   * - `Session`: The session was initialized and the user is authenticated.
   */
  data: Ref<Session | undefined | null>

  /**
   * If the session is currently being fetched.
   */
  loading: Ref<boolean>

  /**
   * The last time the session was refreshed, undefined if the session was not yet initialized.
   */
  lastRefreshedAt: Ref<Date | undefined>

  /**
   * The computed current status of the session.
   *
   * - `loading`: The session is currently being fetched, equivalent to `if (loading.value) {}`.
   * - `authenticated`: The session was initialized and the user is authenticated, equivalent to `if (data.value) {}`.
   * - `unauthenticated`: The session was initialized, but the user is not authenticated, equivalent to `if (!data.value) {}`.
   */
  status: ComputedRef<SessionStatus>
}

export function useAuth(nuxtApp?: NuxtApp) {
  const data = useState<Session | undefined | null>('auth:data', () => undefined)

  const hasInitialSession = computed(() => !!data.value)
  const lastRefreshedAt = useState<Date | undefined>('auth:lastRefreshedAt', () => {
    if (hasInitialSession.value) {
      return new Date()
    }

    return undefined
  })

  const loading = useState<boolean>('auth:loading', () => false)
  const status = computed<SessionStatus>(() => {
    if (loading.value) {
      return 'loading'
    }
    else if (data.value) {
      return 'authenticated'
    }
    else {
      return 'unauthenticated'
    }
  })

  return {
    data,
    loading,
    lastRefreshedAt,
    status,
    getSession: async () => {
      const event = useRequestEvent(nuxtApp)
      const headers = useRequestHeaders(['cookie'])

      loading.value = true

      try {
        const res = await $fetch.raw<Session | null>('/api/auth/session', { headers })

        // Send the cookie back to the client
        // see: https://nuxt.com/docs/getting-started/data-fetching#pass-cookies-from-server-side-api-calls-on-ssr-response
        if (process.server) {
          // If the event is handled, the headers are already sent
          if (!event.handled) {
            // NOTE: getSetCookie is safe to use as we are in the server context
            // see: https://caniuse.com/?search=getSetCookie
            const cookies = res.headers.getSetCookie()
            for (const cookie of cookies) {
              appendResponseHeader(event, 'set-cookie', cookie)
            }
          }
        }

        const session = res._data
        data.value = (typeof session === 'object' && session !== null && Object.keys(session).length > 0) ? session : null
        lastRefreshedAt.value = new Date()
      }
      catch {
        data.value = null
      }
      finally {
        loading.value = false
      }

      return data.value || null
    },

    signIn: async (provider: SupportedProviders, options?: any) => {
      const callbackUrl = `${window.location.origin}/dashboard`

      const isCredentials = provider === 'credentials'
      const basePath = '/api'
      const signInUrl = `${basePath}/auth/${isCredentials ? 'callback' : 'signin'}/${provider}`

      const _signInUrl = `${signInUrl}`

      const { csrfToken } = await $fetch<{ csrfToken: string }>('/api/auth/csrf')

      const response = await $fetch<{ url?: string }>(_signInUrl, {
        method: 'post',
        body: new URLSearchParams({
          ...options,
          csrfToken,
          callbackUrl,
        }),
        headers: {
          'X-Auth-Return-Redirect': '1',
        },
      })

      if (response.url) {
        await navigateTo(response.url, {
          external: true,
        })
      }
    },
  }
}

import type { ComputedRef, Ref } from 'vue'
import type { OAuthProviderType, RedirectableProviderType } from '@auth/core/providers'

import { appendResponseHeader } from 'h3'

import type { NuxtApp } from '#app/nuxt'
import type { Session } from '#auth'

import { computed, navigateTo, reloadNuxtApp, useRequestEvent, useRequestHeaders, useRouter, useState } from '#imports'

interface SignInOptions extends Record<string, any> {
  callbackUrl?: string
  redirect?: boolean
}

export interface SignOutParams<R extends boolean = true> {
  callbackUrl?: string
  redirect?: R
}

declare type SignInAuthorizationParams =
  | string
  | string[][]
  | Record<string, string>
  | URLSearchParams

interface SignInResponse {
  ok: boolean
  status: number
  error: string | undefined
  url: string | null
}

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

  getSession: () => Promise<Session | null>

  signIn<P extends RedirectableProviderType>(providerId: P, options?: SignInOptions, authorizationParams?: SignInAuthorizationParams): Promise<void>

  signIn<P extends RedirectableProviderType>(providerId: P, options?: SignInOptions & { redirect: true }, authorizationParams?: SignInAuthorizationParams): Promise<void>

  signIn<P extends RedirectableProviderType>(providerId: P, options?: SignInOptions & { redirect: false }, authorizationParams?: SignInAuthorizationParams): Promise<SignInResponse>

  signIn<P extends OAuthProviderType>(providerId: P, options?: Omit<SignInOptions, 'redirect'>, authorizationParams?: SignInAuthorizationParams,): Promise<void | SignInResponse>

  signOut: (options?: SignOutParams) => Promise<void>
}

export function useAuth(nuxtApp?: NuxtApp): Auth {
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

    signIn: async (provider: string, options?: Record<string, any>, authorizationParams?: SignInAuthorizationParams): Promise<any> => {
      const { redirect = true } = options ?? {}
      const callbackUrl = options?.callbackUrl ?? `${window.location.origin}/`

      const isCredentials = provider === 'credentials'
      const isEmail = provider === 'email'
      const isSupportingReturn = isCredentials || isEmail

      let signInUrl = `/api/auth/${isCredentials ? 'callback' : 'signin'}/${provider}`
      if (authorizationParams) {
        signInUrl += `?${new URLSearchParams(authorizationParams)}`
      }

      const csrf = await $fetch<{ csrfToken: string }>('/api/auth/csrf')
      const csrfToken = csrf?.csrfToken

      if (!csrfToken) {
        throw new Error('CSRF token not found')
      }

      const response = await $fetch<{ url?: string }>(signInUrl, {
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

      if (isCredentials && !redirect) {
        reloadNuxtApp({ persistState: true, force: true })
      }

      if (redirect || !isSupportingReturn) {
        const to = response.url ?? callbackUrl

        await navigateTo(to, { external: true })

        // If url contains a hash, the browser does not reload the page. We reload manually
        if (to?.includes('#')) {
          reloadNuxtApp({ persistState: true, force: true })
        }

        return
      }

      return response
    },

    signOut: async (options?: SignOutParams) => {

      const callbackUrl = options?.callbackUrl ?? window.location.href

      const csrf = await $fetch<{ csrfToken: string }>('/api/auth/csrf')
      const csrfToken = csrf?.csrfToken

      if (!csrfToken) {
        throw new Error('CSRF token not found')
      }

      const response = await $fetch<{ url: string }>('/api/auth/signout', {
        method: 'post',
        headers: {
          'X-Auth-Return-Redirect': '1',
        },
        body: new URLSearchParams({
          csrfToken,
          callbackUrl,
        }),
      })

      data.value = null

      // Navigate back to where we are.
      const url = response?.url ?? callbackUrl

      // await navigateTo(new URL(url).pathname, { replace: true })
      await useRouter().push({ path: new URL(url).pathname, force: true })

      if (url?.includes('#')) {
        reloadNuxtApp({ persistState: true, force: true })
      }
    },
  }
}

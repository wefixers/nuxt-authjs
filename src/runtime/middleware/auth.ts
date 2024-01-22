import type { PublicModuleOptions } from '../../module'
import { defineNuxtRouteMiddleware, navigateTo, useAuth, useRuntimeConfig } from '#imports'

interface MiddlewareMeta {
  /**
   * Whether to only allow unauthenticated users to access this page.
   *
   * Authenticated users will be redirected to `/` or the route defined in `navigateAuthenticatedTo`
   *
   * @default true
   */
  unauthenticatedOnly?: boolean

  /**
   * Where to redirect authenticated users if `unauthenticatedOnly` is set to true
   *
   * @default undefined
   */
  navigateAuthenticatedTo?: string
}

declare module '#app' {
  interface PageMeta {
    /**
     * Configure authentication for this page.
     *
     * - `false` will disable the auth middleware for this page
     * - `true` will use the default configuration
     */
    auth?: boolean | MiddlewareMeta
  }
}

function getAuthMiddlewareMeta(auth: unknown): MiddlewareMeta | false {
  if (auth === false) {
    return false
  }

  if (typeof auth === 'object') {
    return {
      unauthenticatedOnly: true,
      ...auth,
    }
  }

  return {
    unauthenticatedOnly: true,
  }
}

export default defineNuxtRouteMiddleware((to) => {
  const metaAuth = getAuthMiddlewareMeta(to.meta.auth)

  // shortcut, user have explicitly disabled the auth middleware
  if (metaAuth === false) {
    return
  }

  const { status } = useAuth()

  const isGuestMode = metaAuth.unauthenticatedOnly

  // Guest mode happy path 1: Unauthenticated user is allowed to view page
  if (isGuestMode && status.value === 'unauthenticated') {
    return
  }

  // Guest mode edge-case: Developer used guest-mode config style but set `unauthenticatedOnly` to `false`
  if (!metaAuth.unauthenticatedOnly) {
    return
  }

  if (status.value === 'authenticated') {
    // Guest mode happy path 2: Authenticated user should be directed to another page
    if (isGuestMode) {
      return navigateTo(metaAuth.navigateAuthenticatedTo ?? '/')
    }

    return
  }

  const matchedRoute = to.matched.length > 0
  if (!matchedRoute) {
    return
  }

  // Note: this warning trigger even when authConfig.signIn is set and is protected
  if (process.dev) {
    console.warn(`[Nuxt-Auth]: Guest users cannot access: '${to.fullPath}'`)
  }

  const authConfig = useRuntimeConfig().public.auth as PublicModuleOptions

  // return signIn()
  if (authConfig?.signIn) {
    // prevent infinite redirect loop
    if (to.path === authConfig.signIn) {
      return
    }

    return navigateTo({
      path: authConfig.signIn,
      query: {
        ...to.query,
        error: 'SessionRequired',
        callbackUrl: to.fullPath,
      },
    })
  }

  return navigateTo({
    path: '/api/auth/error',
    query: {
      ...to.query,
      error: 'SessionRequired',
      callbackUrl: to.fullPath,
    },
  }, {
    external: true,
  })
})

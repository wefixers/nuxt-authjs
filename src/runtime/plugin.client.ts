import type { PublicModuleOptions } from '../module'
import { defineNuxtPlugin, useAuth, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  const { data, lastRefreshedAt, getSession } = useAuth()

  // Skip auth if we're prerendering
  if (!process.prerender) {
    // Only fetch session if it was not yet initialized server-side
    if (typeof data.value === 'undefined') {
      await getSession()
    }
  }

  // 2. Setup session maintenance, e.g., auto refreshing or refreshing on foux
  const { refreshOnWindowFocus, refreshPeriodically } = useRuntimeConfig().public.auth as PublicModuleOptions || {}

  // Listen for when the page is visible, if the user switches tabs
  // and makes our tab visible again, re-fetch the session, but only if
  // this feature is not disabled.
  const visibilityHandler = () => {
    if (refreshOnWindowFocus && document.visibilityState === 'visible') {
      getSession()
    }
  }

  // Refetch interval
  let refetchIntervalTimer: any

  nuxtApp.hook('app:mounted', () => {
    document.addEventListener('visibilitychange', visibilityHandler, false)

    if (typeof refreshPeriodically === 'number' && refreshPeriodically > 0) {
      refetchIntervalTimer = setInterval(() => {
        if (data.value) {
          getSession()
        }
      }, refreshPeriodically)
    }
  })

  const _unmount = nuxtApp.vueApp.unmount
  nuxtApp.vueApp.unmount = function () {
    // Clear visibility handler
    document.removeEventListener('visibilitychange', visibilityHandler, false)

    // Clear refetch interval
    clearInterval(refetchIntervalTimer)

    // Clear session
    lastRefreshedAt.value = undefined
    data.value = undefined

    // Call original unmount
    _unmount()
  }
})

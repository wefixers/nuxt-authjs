import type { NuxtApp } from '#app'
import { defineNuxtPlugin, useAuth } from '#imports'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Skip auth if we're prerendering
  if (!process.prerender) {
    const { data, getSession } = useAuth(nuxtApp as NuxtApp)

    if (typeof data.value === 'undefined') {
      await getSession()
    }
  }
})

import { defu } from 'defu'
import { join, relative, resolve as resolvePath } from 'pathe'

import { addImports, addPlugin, addRouteMiddleware, addServerHandler, createResolver, defineNuxtModule, findPath, useLogger } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { name, version } from '../package.json'

export interface ModuleOptions {
  pages: {
    /**
     * @default `/sign-in`
     */
    signIn: string

    /**
     * @default {signIn}
     */
    signOut?: string

    error?: string

    verifyRequest?: string
  }

  /**
   * @default true
   */
  global: boolean

  /**
   * Whether to refresh the session every `X` milliseconds. Set this to `false` or `0` to turn it off. The session will only be refreshed if a session already exists.
   *
   * Setting this to `false` or `0` will turn off session refresh.
   * Setting this to a number `X` will refresh the session every `X` milliseconds.
   *
   * @example 1000
   * @default false
   *
   */
  refreshPeriodically: number | false

  /**
   * Whether to refresh the session every time the browser window is refocused.
   *
   * @example false
   * @default false
   */
  refreshOnWindowFocus: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: 'auth',
  },
  async setup(userOptions, nuxt) {
    const logger = useLogger(name)

    logger.info(`\`${name}\` setup...`)

    const options = defu(userOptions, {
      global: true,
      refreshPeriodically: 0,
      refreshOnWindowFocus: false,
      pages: {
        signIn: '/sign-in',
        signOut: userOptions?.pages?.signIn ?? '/sign-in',
        error: userOptions?.pages?.signIn ?? '/sign-in',
        verifyRequest: `${userOptions?.pages?.signIn ?? '/sign-in'}?verify-request`,
      },
    })

    // check if the signIn page exists
    if (options.pages.signIn) {
      if (!await findPagePath(nuxt, options.pages.signIn)) {
        logger.warn(`\`${name}\` signIn page \`${join('pages', `${options.pages.signIn}.vue`)}\` is missing, the application may never load...`)
      }
    }

    const runtimeConfig = nuxt.options.runtimeConfig

    // Set the module options
    runtimeConfig.auth = defu(runtimeConfig.auth, {
      pages: options.pages,
      email: {
        from: '',
        server: '',
      },
    })

    // Be explicit on what we set publicly
    runtimeConfig.public.auth = defu(runtimeConfig.public.auth, {
      signIn: options.pages.signIn,
      refreshPeriodically: options.refreshPeriodically,
      refreshOnWindowFocus: options.refreshOnWindowFocus,
    })

    runtimeConfig.session = defu(runtimeConfig.session, {
      name: '__session',
      password: '',
      cookie: {
        sameSite: 'lax',
      },
    })

    runtimeConfig.oauth = defu(runtimeConfig.oauth, {
      '42-school': { clientId: '', clientSecret: '' },
      'apple': { clientId: '', clientSecret: '' },
      'asgardeo': { clientId: '', clientSecret: '' },
      'atlassian': { clientId: '', clientSecret: '' },
      'auth0': { clientId: '', clientSecret: '' },
      'authentik': { clientId: '', clientSecret: '' },
      'azure-ad-b2c': { clientId: '', clientSecret: '' },
      'azure-ad': { clientId: '', clientSecret: '' },
      'azure-devops': { clientId: '', clientSecret: '' },
      'battlenet': { clientId: '', clientSecret: '' },
      'beyondidentity': { clientId: '', clientSecret: '' },
      'box': { clientId: '', clientSecret: '' },
      'boxyhq-saml': { clientId: '', clientSecret: '' },
      'bungie': { clientId: '', clientSecret: '' },
      'click-up': { clientId: '', clientSecret: '' },
      'cognito': { clientId: '', clientSecret: '' },
      'coinbase': { clientId: '', clientSecret: '' },
      'descope': { clientId: '', clientSecret: '' },
      'discord': { clientId: '', clientSecret: '' },
      'dribbble': { clientId: '', clientSecret: '' },
      'dropbox': { clientId: '', clientSecret: '' },
      'duende-identity-server6': { clientId: '', clientSecret: '' },
      'eveonline': { clientId: '', clientSecret: '' },
      'facebook': { clientId: '', clientSecret: '' },
      'faceit': { clientId: '', clientSecret: '' },
      'foursquare': { clientId: '', clientSecret: '' },
      'freshbooks': { clientId: '', clientSecret: '' },
      'fusionauth': { clientId: '', clientSecret: '' },
      'github': { clientId: '', clientSecret: '' },
      'gitlab': { clientId: '', clientSecret: '' },
      'google': { clientId: '', clientSecret: '' },
      'hubspot': { clientId: '', clientSecret: '' },
      'identity-server4': { clientId: '', clientSecret: '' },
      'instagram': { clientId: '', clientSecret: '' },
      'kakao': { clientId: '', clientSecret: '' },
      'keycloak': { clientId: '', clientSecret: '' },
      'line': { clientId: '', clientSecret: '' },
      'linkedin': { clientId: '', clientSecret: '' },
      'mailchimp': { clientId: '', clientSecret: '' },
      'mailru': { clientId: '', clientSecret: '' },
      'mastodon': { clientId: '', clientSecret: '' },
      'mattermost': { clientId: '', clientSecret: '' },
      'medium': { clientId: '', clientSecret: '' },
      'naver': { clientId: '', clientSecret: '' },
      'netlify': { clientId: '', clientSecret: '' },
      'notion': { clientId: '', clientSecret: '' },
      'okta': { clientId: '', clientSecret: '' },
      'onelogin': { clientId: '', clientSecret: '' },
      'osso': { clientId: '', clientSecret: '' },
      'osu': { clientId: '', clientSecret: '' },
      'passage': { clientId: '', clientSecret: '' },
      'patreon': { clientId: '', clientSecret: '' },
      'pinterest': { clientId: '', clientSecret: '' },
      'pipedrive': { clientId: '', clientSecret: '' },
      'reddit': { clientId: '', clientSecret: '' },
      'salesforce': { clientId: '', clientSecret: '' },
      'slack': { clientId: '', clientSecret: '' },
      'spotify': { clientId: '', clientSecret: '' },
      'strava': { clientId: '', clientSecret: '' },
      'tiktok': { clientId: '', clientSecret: '' },
      'todoist': { clientId: '', clientSecret: '' },
      'trakt': { clientId: '', clientSecret: '' },
      'twitch': { clientId: '', clientSecret: '' },
      'twitter': { clientId: '', clientSecret: '' },
      'united-effects': { clientId: '', clientSecret: '' },
      'vk': { clientId: '', clientSecret: '' },
      'wikimedia': { clientId: '', clientSecret: '' },
      'wordpress': { clientId: '', clientSecret: '' },
      'workos': { clientId: '', clientSecret: '' },
      'yandex': { clientId: '', clientSecret: '' },
      'zitadel': { clientId: '', clientSecret: '' },
      'zoho': { clientId: '', clientSecret: '' },
      'zoom': { clientId: '', clientSecret: '' },
    })

    const resolver = createResolver(import.meta.url)

    // Add the auth handler
    addServerHandler({
      route: '/api/auth/**',
      handler: resolver.resolve('./runtime/server/handler'),
    })

    // Add the route middleware
    addRouteMiddleware({
      global: options.global ?? true,
      name: 'auth',
      path: resolver.resolve('./runtime/middleware/auth'),
    })

    // Add the client-side plugins
    addPlugin({
      mode: 'client',
      src: resolver.resolve('./runtime/plugin.client'),
    })

    // Add the server-side plugins
    addPlugin({
      mode: 'server',
      src: resolver.resolve('./runtime/plugin.server'),
    })

    // Add all the composables, be explicit on what we add
    addImports([
      {
        name: 'useAuth',
        from: resolver.resolve('./runtime/composables/useAuth'),
      },
    ])

    // addServerImports([
    //   {
    //     name: 'defineAuthMiddleware',
    //     from: resolver.resolve('./runtime/server/utils'),
    //   },
    //   {
    //     name: 'getServerSession',
    //     from: resolver.resolve('./runtime/server/utils'),
    //   },
    // ])

    if (nuxt.options.nitro.imports !== false) {
      nuxt.options.nitro.imports = defu(nuxt.options.nitro.imports, {
        presets: [
          {
            from: resolver.resolve('./runtime/server/utils'),
            imports: [
              'defineAuthMiddleware',
              'getServerSession',
            ],
          },
        ],
      })
    }

    logger.success(`\`${name}\` setup done`)
  },
})

/**
 * Find the fully qualified file path of a page, return `null` if it doesn't exist.
 * It usually terminates with `.vue`.
 *
 * @param nuxt The Nuxt instance
 * @param path The page router path, without the file extension
 */
function findPagePath(nuxt: Nuxt, path: string) {
  const pagesDir = resolvePath(resolvePath(nuxt.options.srcDir), nuxt.options.dir.pages)

  const singInPage = join(pagesDir, path)

  return findPath(relative(pagesDir, singInPage), { cwd: pagesDir })
}

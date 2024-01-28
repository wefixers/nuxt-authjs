import { defu } from 'defu'
import { join, relative, resolve as resolvePath } from 'pathe'

import { addImports, addPlugin, addRouteMiddleware, addServerHandler, addServerImports, addServerImportsDir, addTemplate, createResolver, defineNuxtModule, findPath, useLogger } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { name, version } from '../package.json'

export interface ModuleOptions {
  pages: {
    /**
     * @default `/sign-in`
     */
    signIn: string
    signOut: string
    error: string
    verifyRequest: string
  }

  /**
   * @default true
   */
  global: boolean

  /**
   * Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.
   *
   * Setting this to `false` will turn off session refresh.
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

export type PublicModuleOptions = Pick<ModuleOptions, 'pages' | 'global' | 'refreshPeriodically' | 'refreshOnWindowFocus'> & {
  signIn: string
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

    const options = defu<ModuleOptions, [ModuleOptions]>(userOptions, {
      global: true,
      refreshPeriodically: false,
      refreshOnWindowFocus: false,
      pages: {
        signIn: '/sign-in',
        signOut: '/sign-out',
        error: '/sign-in',
        verifyRequest: '/sign-in?verify-request',
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
    })

    // Be explicit on what we set publicly
    runtimeConfig.public.auth = defu(runtimeConfig.public.auth, {
      signIn: options.pages.signIn,
      refreshPeriodically: options.refreshPeriodically as any,
      refreshOnWindowFocus: options.refreshOnWindowFocus,
    })

    runtimeConfig.session = defu(runtimeConfig.session, {
      name: '__session',
      password: '',
      cookie: {
        sameSite: 'lax',
      },
    })

    runtimeConfig.oauth = defu(runtimeConfig.oauth, {})
    runtimeConfig.oauth['42-school'] = defu(runtimeConfig.oauth['42-school'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.apple = defu(runtimeConfig.oauth.apple, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.asgardeo = defu(runtimeConfig.oauth.asgardeo, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.atlassian = defu(runtimeConfig.oauth.atlassian, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.auth0 = defu(runtimeConfig.oauth.auth0, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.authentik = defu(runtimeConfig.oauth.authentik, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['azure-ad-b2c'] = defu(runtimeConfig.oauth['azure-ad-b2c'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['azure-ad'] = defu(runtimeConfig.oauth['azure-ad'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['azure-devops'] = defu(runtimeConfig.oauth['azure-devops'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.battlenet = defu(runtimeConfig.oauth.battlenet, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.beyondidentity = defu(runtimeConfig.oauth.beyondidentity, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.box = defu(runtimeConfig.oauth.box, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['boxyhq-saml'] = defu(runtimeConfig.oauth['boxyhq-saml'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.bungie = defu(runtimeConfig.oauth.bungie, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['click-up'] = defu(runtimeConfig.oauth['click-up'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.cognito = defu(runtimeConfig.oauth.cognito, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.coinbase = defu(runtimeConfig.oauth.coinbase, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.descope = defu(runtimeConfig.oauth.descope, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.discord = defu(runtimeConfig.oauth.discord, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.dribbble = defu(runtimeConfig.oauth.dribbble, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.dropbox = defu(runtimeConfig.oauth.dropbox, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['duende-identity-server6'] = defu(runtimeConfig.oauth['duende-identity-server6'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.eveonline = defu(runtimeConfig.oauth.eveonline, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.facebook = defu(runtimeConfig.oauth.facebook, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.faceit = defu(runtimeConfig.oauth.faceit, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.foursquare = defu(runtimeConfig.oauth.foursquare, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.freshbooks = defu(runtimeConfig.oauth.freshbooks, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.fusionauth = defu(runtimeConfig.oauth.fusionauth, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.github = defu(runtimeConfig.oauth.github, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.gitlab = defu(runtimeConfig.oauth.gitlab, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.google = defu(runtimeConfig.oauth.google, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.hubspot = defu(runtimeConfig.oauth.hubspot, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['identity-server4'] = defu(runtimeConfig.oauth['identity-server4'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.instagram = defu(runtimeConfig.oauth.instagram, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.kakao = defu(runtimeConfig.oauth.kakao, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.keycloak = defu(runtimeConfig.oauth.keycloak, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.line = defu(runtimeConfig.oauth.line, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.linkedin = defu(runtimeConfig.oauth.linkedin, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.mailchimp = defu(runtimeConfig.oauth.mailchimp, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.mailru = defu(runtimeConfig.oauth.mailru, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.mastodon = defu(runtimeConfig.oauth.mastodon, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.mattermost = defu(runtimeConfig.oauth.mattermost, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.medium = defu(runtimeConfig.oauth.medium, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.naver = defu(runtimeConfig.oauth.naver, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.netlify = defu(runtimeConfig.oauth.netlify, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.notion = defu(runtimeConfig.oauth.notion, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.okta = defu(runtimeConfig.oauth.okta, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.onelogin = defu(runtimeConfig.oauth.onelogin, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.osso = defu(runtimeConfig.oauth.osso, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.osu = defu(runtimeConfig.oauth.osu, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.passage = defu(runtimeConfig.oauth.passage, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.patreon = defu(runtimeConfig.oauth.patreon, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.pinterest = defu(runtimeConfig.oauth.pinterest, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.pipedrive = defu(runtimeConfig.oauth.pipedrive, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.reddit = defu(runtimeConfig.oauth.reddit, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.salesforce = defu(runtimeConfig.oauth.salesforce, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.slack = defu(runtimeConfig.oauth.slack, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.spotify = defu(runtimeConfig.oauth.spotify, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.strava = defu(runtimeConfig.oauth.strava, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.tiktok = defu(runtimeConfig.oauth.tiktok, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.todoist = defu(runtimeConfig.oauth.todoist, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.trakt = defu(runtimeConfig.oauth.trakt, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.twitch = defu(runtimeConfig.oauth.twitch, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.twitter = defu(runtimeConfig.oauth.twitter, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth['united-effects'] = defu(runtimeConfig.oauth['united-effects'], { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.vk = defu(runtimeConfig.oauth.vk, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.wikimedia = defu(runtimeConfig.oauth.wikimedia, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.wordpress = defu(runtimeConfig.oauth.wordpress, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.workos = defu(runtimeConfig.oauth.workos, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.yandex = defu(runtimeConfig.oauth.yandex, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.zitadel = defu(runtimeConfig.oauth.zitadel, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.zoho = defu(runtimeConfig.oauth.zoho, { clientId: '', clientSecret: '' })
    runtimeConfig.oauth.zoom = defu(runtimeConfig.oauth.zoom, { clientId: '', clientSecret: '' })

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

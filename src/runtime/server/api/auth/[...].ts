import { eventHandler, toWebRequest } from 'h3'
import { Auth } from '@auth/core'
import { serialize } from 'cookie-es'

import type { NuxtAuthConfig } from '../../index'

export default eventHandler(async (event) => {
  const options = event.context.$auth?.options

  if (!options) {
    if (process.dev) {
      console.error('[Nuxt-Auth]: Missing authPlugin, this error will not be shown in production, a generic 404 will be returned instead.')
    }

    throw createError({
      statusCode: 404,
    })
  }

  const request = toWebRequest(event)
  if (request.url.includes('.js.map')) {
    return
  }

  let response

  // Special case for credentials callback
  if (request.method === 'POST' && options.session.strategy === 'database' && isCredentialsCallback(request)) {
    response = await handleCredentialsCallback(request, options)
  }
  else {
    response = await Auth(request, options)
  }

  return response
})

// see: https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/lib/utils/web.ts
function isCredentialsCallback(req: Request) {
  const originalUrl = new URL(req.url.replace(/\/$/, ''))
  const url = new URL(originalUrl)
  const pathname = url.pathname.replace(/\/$/, '')

  return pathname.endsWith('/callback/credentials')
}

async function handleCredentialsCallback(request: Request, config: NuxtAuthConfig) {
  let userId: string | undefined

  config = {
    ...config,
    callbacks: {
      ...config.callbacks,

      // patch the original jwt callback to get the user id
      jwt({ user }) {
        // if (!user) {
        //   throw new CredentialsSignin()
        // }

        userId = user?.id
        return null
      },
    },
  }

  const response = await Auth(request, config)

  if (userId) {
    const session = await config.adapter!.createSession!({
      userId,
      sessionToken: config.session.generateSessionToken(),
      expires: new Date(Date.now() + (config.session?.maxAge || 2592000) * 1000),
    })

    const sessionCookie = {
      name: config.cookies.sessionToken.name,
      value: session.sessionToken,
      options: {
        ...config.cookies.sessionToken.options,
        expires: session.expires,
      },
    }

    // get all the cookies from the response, except the session cookie
    const cookies = response.headers.getSetCookie().filter(cookie => !cookie.startsWith(`${sessionCookie.name}=`))

    // delete all the cookies from the response
    response.headers.delete('set-cookie')

    // add back all the cookies
    for (const cookie of cookies) {
      response.headers.append('set-cookie', cookie)
    }

    // regenerate the session cookie
    response.headers.append('set-cookie', serialize(sessionCookie.name, sessionCookie.value, sessionCookie.options))
  }

  return response
}

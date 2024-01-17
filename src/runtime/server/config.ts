import type { JWT, JWTDecodeParams, JWTEncodeParams, JWTOptions } from '@auth/core/jwt'
import type { Provider } from '@auth/core/providers'
import type { AuthConfig as AuthCoreConfig, CallbacksOptions, CookieOption, PagesOptions } from '@auth/core/types'
import { defu } from 'defu'
import { hkdf } from '@panva/hkdf'
import { EncryptJWT, jwtDecrypt } from 'jose'

interface PartialAuthConfig extends Omit<Partial<AuthCoreConfig>, 'raw'> {
  basePath?: string
}

/**
 * Represents a default configuration for authjs
 */
export interface DefaultAuthConfig extends Omit<AuthCoreConfig, 'raw'> {
  /**
   * @default false
   */
  debug: boolean

  /**
   * @default true
   */
  trustHost: boolean

  /**
   * @default `/api/auth`
   */
  basePath: string

  /**
   * @default []
   */
  providers: Provider[]

  /**
   * ### Default:
   * ```js
   * {
   *   signIn: '/sign-in',
   *   signOut: '/sign-out',
   *   error: '/sign-in',
   *   verifyRequest: '/sign-in?verify-request',
   * }
   */
  pages: PagesOptions

  cookies: {
    sessionToken: CookieOption
    callbackUrl: CookieOption
    csrfToken: CookieOption
    pkceCodeVerifier: CookieOption
    state: CookieOption
    nonce: CookieOption
  }

  session: {
    strategy: 'jwt' | 'database'
    maxAge: number
    updateAge: number
    generateSessionToken: () => string
  }

  jwt: Partial<JWTOptions> & {
    maxAge: number
  }

  callbacks: CallbacksOptions
}

/**
 * Create a new {@link DefaultAuthConfig} object.
 */
export function defineAuthConfig(config: PartialAuthConfig, ...defaults: PartialAuthConfig[]): DefaultAuthConfig {
  const options = defu(config || {}, ...defaults)

  const SING_IN_PAGE = '/sign-in'
  const VERIFY_REQUEST_PAGE = `${SING_IN_PAGE}?verify-request`

  const maxAge = 30 * 24 * 60 * 60 // Sessions expire after 30 days of being idle by default

  // Manually merge the default options
  return {
    basePath: options?.basePath || '/api/auth',
    trustHost: true,
    providers: [],
    debug: false,
    theme: {
      colorScheme: 'auto',
      logo: '',
      brandColor: '',
      buttonText: '',
    },
    ...options,
    pages: <PagesOptions>{
      signIn: (options?.pages?.signIn || SING_IN_PAGE),
      signOut: options?.pages?.signOut || (options?.pages?.signIn || SING_IN_PAGE),
      error: options?.pages?.error || (options?.pages?.signIn || SING_IN_PAGE),
      verifyRequest: options?.pages?.verifyRequest || (options?.pages?.signIn || VERIFY_REQUEST_PAGE),
      ...options?.pages,
    },
    cookies: {
      ...options?.cookies,
      sessionToken: <CookieOption>{
        name: `__session`,
        ...options?.cookies?.sessionToken,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          ...options?.cookies?.sessionToken?.options,
        },
      },
      callbackUrl: <CookieOption>{
        name: `__Secure-auth.callback-url`,
        ...options?.cookies?.callbackUrl,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          ...options?.cookies?.callbackUrl?.options,
        },
      },
      csrfToken: <CookieOption>{
        name: `__Host-auth.csrf-token`,
        ...options?.cookies?.csrfToken,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          ...options?.cookies?.csrfToken?.options,
        },
      },
      pkceCodeVerifier: <CookieOption>{
        name: `__Secure-auth.pkce.code_verifier`,
        ...options?.cookies?.pkceCodeVerifier,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          maxAge: 60 * 15, // 15 minutes in seconds
          ...options?.cookies?.pkceCodeVerifier?.options,
        },
      },
      state: <CookieOption>{
        name: `__Secure-auth.state`,
        ...options?.cookies?.state,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          maxAge: 60 * 15, // 15 minutes in seconds
          ...options?.cookies?.state?.options,
        },
      },
      nonce: <CookieOption>{
        name: `__Secure-auth.nonce`,
        ...options?.cookies?.nonce,
        options: {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: true,
          ...options?.cookies?.nonce?.options,
        },
      },
    },
    session: {
      strategy: options?.adapter ? 'database' : 'jwt',
      maxAge,
      updateAge: 24 * 60 * 60,
      generateSessionToken: () => crypto.randomUUID(),
      ...options?.session,
    },
    jwt: <JWTOptions>{
      maxAge,
      encode,
      decode,
      ...options?.jwt,
    },
    callbacks: <CallbacksOptions>{
      signIn() {
        return true
      },
      redirect({ url, baseUrl }) {
        if (url.startsWith('/')) {
          return `${baseUrl}${url}`
        }

        else if (new URL(url).origin === baseUrl) {
          return url
        }

        return baseUrl
      },
      session({ session }) {
        return session
      },
      jwt({ token }) {
        return token
      },
      ...options?.callbacks,
    },
  }
}

const DEFAULT_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
const now = () => (Date.now() / 1000) | 0

async function encode<Payload = JWT>(params: JWTEncodeParams<Payload>) {
  const { token = {}, secret, maxAge = DEFAULT_MAX_AGE, salt } = params
  const encryptionSecret = await getDerivedEncryptionKey(secret, salt)
  return await new EncryptJWT(token as any)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(now() + maxAge)
    .setJti(crypto.randomUUID())
    .encrypt(encryptionSecret)
}

async function decode<Payload = JWT>(params: JWTDecodeParams): Promise<Payload | null> {
  const { token, secret, salt } = params
  if (!token) { return null }
  const encryptionSecret = await getDerivedEncryptionKey(secret, salt)
  const { payload } = await jwtDecrypt(token, encryptionSecret, {
    clockTolerance: 15,
  })
  return payload as Payload
}

async function getDerivedEncryptionKey(keyMaterial: Parameters<typeof hkdf>[1], salt: Parameters<typeof hkdf>[2]) {
  return await hkdf('sha256', keyMaterial, salt, `Auth Encryption Key (${salt})`, 32)
}

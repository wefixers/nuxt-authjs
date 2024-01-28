import type { JWT, JWTDecodeParams, JWTEncodeParams, JWTOptions } from '@auth/core/jwt'
import type { Provider } from '@auth/core/providers'
import type { AuthConfig as AuthCoreConfig, CallbacksOptions, CookieOption, PagesOptions } from '@auth/core/types'
import { hkdf } from '@panva/hkdf'
import { EncryptJWT, jwtDecrypt } from 'jose'

export interface AuthUserConfig extends Omit<Partial<AuthCoreConfig>, 'raw'> {
  /**
   * The base URL of the application.
   *
   * @example
   *
   * ```ts
   * {
   *   basePath: `/api/auth`
   * }
   * ```
   */
  basePath?: string

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
  pages?: Partial<PagesOptions>
}

/**
 * Represents a default configuration for authjs
 */
export interface ResolvedAuthConfig extends Omit<AuthCoreConfig, 'raw'> {
  /**
   * @default `/api/auth`
   */
  basePath: string

  /**
   * @default false
   */
  debug: boolean

  /**
   * @default true
   */
  trustHost: boolean

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

  jwt: JWTOptions

  callbacks: CallbacksOptions
}

/**
 * Create a new {@link ResolvedAuthConfig} object.
 */
export function resolveAuthConfig(options?: AuthUserConfig): ResolvedAuthConfig {
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
        name: `auth.callback-url`,
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
        name: `auth.csrf-token`,
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
        name: `auth.pkce.code_verifier`,
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
        name: `auth.state`,
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
        name: `auth.nonce`,
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

export async function encode<Payload = JWT>(params: JWTEncodeParams<Payload>) {
  const { token = {}, secret, maxAge = DEFAULT_MAX_AGE, salt } = params
  const encryptionSecret = await getDerivedEncryptionKey(secret, salt)
  return await new EncryptJWT(token as any)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(((Date.now() / 1000) | 0) + maxAge)
    .setJti(crypto.randomUUID())
    .encrypt(encryptionSecret)
}

export async function decode<Payload = JWT>(params: JWTDecodeParams): Promise<Payload | null> {
  const { token, secret, salt } = params
  if (!token) {
    return null
  }
  const encryptionSecret = await getDerivedEncryptionKey(secret, salt)
  const { payload } = await jwtDecrypt(token, encryptionSecret, {
    clockTolerance: 15,
  })
  return payload as Payload
}

async function getDerivedEncryptionKey(keyMaterial: Parameters<typeof hkdf>[1], salt: Parameters<typeof hkdf>[2]) {
  return await hkdf('sha256', keyMaterial, salt, `Auth Encryption Key (${salt})`, 32)
}

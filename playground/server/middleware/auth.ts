import Google from '@auth/core/providers/google'
import Credentials from '@auth/core/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import type { EmailConfig, EmailUserConfig } from '@auth/core/providers/email'

import { prisma } from '../../server/prisma'

function Email(config?: EmailUserConfig): EmailConfig {
  return {
    id: 'email',
    type: 'email',
    name: 'Email',
    server: { host: 'localhost', port: 25, auth: { user: '', pass: '' } },
    from: 'Auth.js <no-reply@authjs.dev>',
    maxAge: 24 * 60 * 60,
    async sendVerificationRequest() {
      throw new Error(`Email provider is not configured to send emails`)
    },
    options: config ?? {},
  }
}

export default defineAuthMiddleware({
  adapter: PrismaAdapter(prisma),
  providers: [
    Email,
    Google,
    Credentials({
      async authorize(credentials: any) {
        if (!credentials.email?.includes('@')) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findFirst()

        return user
      },
    }),
  ],
})

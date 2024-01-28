import Google from '@auth/core/providers/google'
import Credentials from '@auth/core/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '../../server/prisma'

export default defineAuthMiddleware({
  adapter: PrismaAdapter(prisma),
  providers: [
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

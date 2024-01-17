import Google from '@auth/core/providers/google'
import Credentials from '@auth/core/providers/credentials'

import { PrismaAdapter } from '@auth/prisma-adapter'

import { prisma } from '../../server/prisma'
import { authPlugin } from '#auth'

export default authPlugin({
  pages: {
    signIn: '/sign-in',
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    Credentials({
      async authorize(_credentials) {
        const user = await prisma.user.findFirst()

        return user
      },
    }),
  ],
  callbacks: {
    formatUser(user) {
      return {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        image: user.image || undefined,
      }
    },
  },
})

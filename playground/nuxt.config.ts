export default defineNuxtConfig({
  modules: ['../src/module'],
  auth: {
    pages: {
      signIn: '/sign-in',
    },
  },
  devtools: {
    enabled: true,
  },
})

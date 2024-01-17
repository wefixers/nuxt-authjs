export default defineNuxtConfig({
  modules: ['../src/module'],
  auth: {
    signIn: '/sign-in',
  },
  devtools: {
    enabled: true,
  },
})

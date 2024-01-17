<script setup lang="ts">
definePageMeta({
  auth: true,
})

const { data } = useAuth()
const { signIn } = useAuth()

async function signInWithGoogle() {
  await signIn('google')
}

async function signInWithCredentials() {
  await signIn('credentials')
}

async function trigger404() {
  await $fetch('/api/auth/asdasda')
}
async function trigger4042() {
  await $fetch('/api/auth/asdasda', {
    method: 'POST',
  })
}
</script>

<template>
  <div>
    <pre><code>{{ data }}</code></pre>

    <button @click="trigger404">
      trigger404
    </button>
    <button @click="trigger4042">
      trigger404Post
    </button>

    <button @click="signInWithCredentials">
      Sign in Credentials
    </button>

    <button @click="signInWithGoogle">
      Sign in
    </button>

    <NuxtLink to="/dashboard">
      Dashboard
    </NuxtLink>
  </div>
</template>

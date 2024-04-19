<script setup lang="ts">
definePageMeta({
  auth: {
    unauthenticatedOnly: true,
  },
})

const { data } = useAuth()
const { signIn, signOut } = useAuth()

async function signInWithEmail() {
  await signIn('email', {
    email: 'test@example.com',
  })
}

async function signInWithGoogle() {
  await signIn('google')
}

async function signInWithCredentials() {
  await signIn('credentials', {
    email: 'test@example.com',
  })
}

async function signInWithInvalidCredentials() {
  await signIn('credentials', {
    email: 'invalid',
  })
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

    <button @click="signInWithInvalidCredentials">
      Sign in Invalid Credentials
    </button>

    <button @click="signInWithGoogle">
      Sign in
    </button>

    <button @click="signInWithEmail">
      Sign in (Email)
    </button>

    <button @click="() => signOut()">
      Sign out
    </button>

    <NuxtLink to="/dashboard">
      Dashboard
    </NuxtLink>
  </div>
</template>

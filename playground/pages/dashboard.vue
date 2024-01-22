<script setup lang="ts">
definePageMeta({
  auth: true,
})

const { data, signOut } = useAuth()

async function testProtectedRoute() {
  const { data } = await $fetch('/api/protected')
  console.log(data)
}
</script>

<template>
  <div>
    <pre><code>{{ data }}</code></pre>

    <NuxtLink to="/">
      Home
    </NuxtLink>

    <button @click="testProtectedRoute">
      testProtectedRoute
    </button>

    <button @click="() => signOut()">
      Sign out
    </button>

    <NuxtLink to="/sign-in">
      Sign
    </NuxtLink>
  </div>
</template>

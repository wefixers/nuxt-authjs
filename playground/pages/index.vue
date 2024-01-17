<script setup lang="ts">
definePageMeta({
  auth: false,
})

const { data } = useAuth()
</script>

<template>
  <div>
    <pre><code>{{ data }}</code></pre>

    <NuxtLink to="/dashboard">
      Dashboard
    </NuxtLink>

    <NuxtLink to="/sign-in">
      Sign
    </NuxtLink>
  </div>
</template>

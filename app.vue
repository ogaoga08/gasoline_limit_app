<script setup="ts">
// ページタイトルの設定
useHead({
  titleTemplate: (title) => {
    return title
      ? `${title} | インターンシップ2024`
      : 'インターンシップ2024'
  },
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style>
body {
  margin: 0;
}
</style>
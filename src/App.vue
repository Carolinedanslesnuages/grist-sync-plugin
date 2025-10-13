<script setup lang="ts">
import ApiToGrist from './components/ApiToGrist.vue'
</script>

<template>
  <div class="app-container">
    <ApiToGrist />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px 0;
}
</style>

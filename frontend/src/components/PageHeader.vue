<template>
  <div class="page-header">
    <div class="header-content">
      <div>
        <h1 class="page-title">{{ title }}</h1>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions"></slot>
    </div>
    <div class="divider"></div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.page-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 0.875rem;
  color: #AAA;
  margin: 0.5rem 0 0 0;
}

.divider {
  height: 1px;
  background: linear-gradient(to right, #ff6700 0%, #555 20%, #555 100%);
  margin-bottom: 1.5rem;
}

/* Mobile adjustments */
@media screen and (max-width: 767px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
  }
}
</style>

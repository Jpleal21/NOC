<template>
  <div>
    <!-- Server List (Full width) -->
    <ServerList
      :servers="servers"
      :loading="loading"
      @refresh="$emit('refresh')"
      @delete="$emit('delete', $event)"
      @deploy="$emit('deploy', $event)"
    />
  </div>
</template>

<script setup>
import ServerList from '../ServerList.vue';

defineProps({
  servers: Array,
  loading: Boolean,
});

defineEmits(['refresh', 'delete', 'deploy']);
</script>

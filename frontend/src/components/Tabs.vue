<template>
  <div class="border-b border-dark-border">
    <nav class="-mb-px flex space-x-8" aria-label="Tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="$emit('change', tab.id)"
        :class="[
          activeTab === tab.id
            ? 'border-primary-500 text-primary-400'
            : 'border-transparent text-dark-muted hover:text-white hover:border-dark-muted',
          'group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors'
        ]"
      >
        <component
          :is="tab.icon"
          :class="[
            activeTab === tab.id ? 'text-primary-400' : 'text-dark-muted group-hover:text-white',
            '-ml-0.5 mr-2 h-5 w-5 transition-colors'
          ]"
        />
        <span>{{ tab.name }}</span>
        <span
          v-if="tab.count !== undefined"
          :class="[
            activeTab === tab.id
              ? 'bg-primary-500/20 text-primary-400'
              : 'bg-dark-hover text-dark-muted group-hover:bg-dark-border',
            'ml-2 py-0.5 px-2.5 rounded-full text-xs font-medium transition-colors'
          ]"
        >
          {{ tab.count }}
        </span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { h } from 'vue';

defineProps({
  tabs: {
    type: Array,
    required: true,
  },
  activeTab: {
    type: String,
    required: true,
  },
});

defineEmits(['change']);
</script>

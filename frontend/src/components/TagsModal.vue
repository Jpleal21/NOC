<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div class="bg-dark-card border border-dark-border rounded-lg shadow-2xl w-full max-w-md mx-4">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
        <h3 class="text-lg font-semibold text-white">
          Manage Tags - {{ server.name }}
        </h3>
        <button
          @click="$emit('close')"
          class="text-dark-muted hover:text-white transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="px-6 py-4 space-y-4">
        <!-- Add New Tag -->
        <div>
          <label class="block text-sm font-medium text-white mb-2">
            Add New Tag
          </label>
          <div class="flex space-x-2">
            <input
              v-model="newTag"
              @keyup.enter="addTag"
              type="text"
              placeholder="e.g., production, customer-abc"
              class="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-white
                     placeholder-dark-muted focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <button
              @click="addTag"
              :disabled="!newTag.trim()"
              class="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-hover
                     disabled:text-dark-muted text-white rounded-lg transition-colors font-medium"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Current Tags -->
        <div>
          <label class="block text-sm font-medium text-white mb-2">
            Current Tags
          </label>
          <div v-if="tags.length === 0" class="text-sm text-dark-muted py-4 text-center border border-dashed border-dark-border rounded-lg">
            No tags yet
          </div>
          <div v-else class="flex flex-wrap gap-2">
            <span
              v-for="tag in tags"
              :key="tag"
              class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 group"
            >
              {{ tag }}
              <button
                @click="removeTag(tag)"
                class="ml-2 text-blue-400 hover:text-red-400 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-dark-border flex justify-end">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-dark-hover hover:bg-dark-border text-white rounded-lg transition-colors font-medium"
        >
          Done
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import api from '../services/api';

const props = defineProps({
  server: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'tags-updated']);

const tags = ref([...(props.server.tags || [])]);
const newTag = ref('');

async function addTag() {
  const tag = newTag.value.trim();
  if (!tag || tags.value.includes(tag)) {
    newTag.value = '';
    return;
  }

  try {
    const result = await api.addServerTag(props.server.name, tag);
    if (result.success) {
      tags.value.push(tag);
      newTag.value = '';
      emit('tags-updated', { server: props.server.name, tags: tags.value });
      toast.success('Tag added', {
        description: `Added tag "${tag}" to ${props.server.name}`
      });
    } else {
      toast.error('Failed to add tag', {
        description: result.error || 'Unknown error occurred'
      });
    }
  } catch (error) {
    console.error('[TagsModal] Failed to add tag:', error);
    toast.error('Failed to add tag', {
      description: error.message || 'Network error occurred'
    });
  }
}

async function removeTag(tag) {
  try {
    const result = await api.removeServerTag(props.server.name, tag);
    if (result.success) {
      tags.value = tags.value.filter(t => t !== tag);
      emit('tags-updated', { server: props.server.name, tags: tags.value });
      toast.success('Tag removed', {
        description: `Removed tag "${tag}" from ${props.server.name}`
      });
    } else {
      toast.error('Failed to remove tag', {
        description: result.error || 'Unknown error occurred'
      });
    }
  } catch (error) {
    console.error('[TagsModal] Failed to remove tag:', error);
    toast.error('Failed to remove tag', {
      description: error.message || 'Network error occurred'
    });
  }
}
</script>

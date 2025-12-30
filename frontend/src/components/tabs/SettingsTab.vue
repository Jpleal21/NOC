<template>
  <div class="space-y-6">
    <!-- Appearance Section -->
    <div class="bg-dark-card border border-dark-border rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-dark-border">
        <h2 class="text-lg font-semibold text-white">Appearance</h2>
        <p class="text-sm text-dark-muted mt-1">
          Customize the look and feel of the NOC platform
        </p>
      </div>
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <label class="text-sm font-medium text-white">Dark Mode</label>
            <p class="text-xs text-dark-muted mt-1">
              Switch between light and dark themes
            </p>
          </div>
          <button
            @click="$emit('toggle-dark-mode')"
            :class="[
              darkMode
                ? 'bg-primary-500'
                : 'bg-dark-hover',
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-bg'
            ]"
            role="switch"
            :aria-checked="darkMode"
          >
            <span
              :class="[
                darkMode ? 'translate-x-5' : 'translate-x-0',
                'pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
              ]"
            >
              <span
                :class="[
                  darkMode ? 'opacity-0 duration-100 ease-out' : 'opacity-100 duration-200 ease-in',
                  'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity'
                ]"
                aria-hidden="true"
              >
                <!-- Sun icon -->
                <svg class="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M6 0h1v2H6zM9.293 1.293l.707.707-1.414 1.414-.707-.707zM10 5v1h2V5zM9.293 9.293l.707.707-1.414 1.414-.707-.707zM6 10v2H5v-2zM2.707 9.293l-.707.707 1.414 1.414.707-.707zM0 5h2v1H0zM2.707 1.293L1.293.586l1.414 1.414.707-.707z" />
                </svg>
              </span>
              <span
                :class="[
                  darkMode ? 'opacity-100 duration-200 ease-in' : 'opacity-0 duration-100 ease-out',
                  'absolute inset-0 flex h-full w-full items-center justify-center transition-opacity'
                ]"
                aria-hidden="true"
              >
                <!-- Moon icon -->
                <svg class="h-3 w-3 text-primary-600" fill="currentColor" viewBox="0 0 12 12">
                  <path d="M11 6a5 5 0 01-5 5 5 5 0 01-4.9-4A6 6 0 016.1 1 5 5 0 0111 6z" />
                </svg>
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- API Status Section -->
    <div class="bg-dark-card border border-dark-border rounded-lg shadow-sm">
      <div class="px-6 py-4 border-b border-dark-border">
        <h2 class="text-lg font-semibold text-white">API Status</h2>
        <p class="text-sm text-dark-muted mt-1">
          Connection status for external services
        </p>
      </div>
      <div class="px-6 py-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm text-white">DigitalOcean API</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Connected
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-white">Cloudflare DNS API</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Connected
          </span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm text-white">Infisical Secrets</span>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            Connected
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  darkMode: {
    type: Boolean,
    default: true,
  },
});

defineEmits(['toggle-dark-mode']);
</script>

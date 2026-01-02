<template>
  <div class="min-h-screen bg-dark-bg">
    <!-- Header -->
    <header class="bg-dark-surface border-b border-dark-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">Servers</h1>
            <p class="text-sm text-dark-muted mt-1">Manage deployed servers</p>
          </div>
          <router-link
            to="/deploy"
            class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            + Deploy Server
          </router-link>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-dark-surface rounded-lg border border-dark-border">
        <ServerList />
      </div>
    </main>
  </div>
</template>

<script setup>
import ServerList from '../components/ServerList.vue'
</script>

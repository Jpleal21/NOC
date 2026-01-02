<template>
  <div class="page-container">
    <!-- Page Header -->
    <PageHeader
      title="Settings"
      subtitle="Configure NOC platform preferences"
    />

    <SettingsTab
      :dark-mode="settingsStore.darkMode"
      @toggle-dark-mode="settingsStore.toggleDarkMode"
    />
  </div>
</template>

<script setup>
import PageHeader from '../components/PageHeader.vue';
import SettingsTab from '../components/tabs/SettingsTab.vue';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
</script>

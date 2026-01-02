<template>
  <div>
    <SettingsTab
      :dark-mode="settingsStore.darkMode"
      @toggle-dark-mode="settingsStore.toggleDarkMode"
    />
  </div>
</template>

<script setup>
import SettingsTab from '../components/tabs/SettingsTab.vue';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
</script>

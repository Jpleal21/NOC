import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: true
  }),

  actions: {
    loadDarkMode() {
      const saved = localStorage.getItem('noc-dark-mode')
      this.darkMode = saved !== 'false' // Default to true
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode
      localStorage.setItem('noc-dark-mode', this.darkMode.toString())
    },

    setDarkMode(value) {
      this.darkMode = value
      localStorage.setItem('noc-dark-mode', value.toString())
    }
  }
})

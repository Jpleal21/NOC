import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    darkMode: true
  }),

  actions: {
    loadDarkMode() {
      const saved = localStorage.getItem('noc-dark-mode')
      this.darkMode = saved !== 'false' // Default to true
      this.applyDarkMode()
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode
      localStorage.setItem('noc-dark-mode', this.darkMode.toString())
      this.applyDarkMode()
    },

    setDarkMode(value) {
      this.darkMode = value
      localStorage.setItem('noc-dark-mode', value.toString())
      this.applyDarkMode()
    },

    applyDarkMode() {
      if (this.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }
})

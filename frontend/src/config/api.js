// Shared API configuration
// Used by api.js and composables that need API endpoints

export const API_BASE_URL = import.meta.env.DEV
  ? '/api' // Proxied to Worker dev server in dev mode
  : 'https://noc-api.flaggerlink.com';

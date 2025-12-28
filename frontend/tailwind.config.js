/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary brand color - FlaggerLink orange (replaces default blue)
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#ff6700',  // FlaggerLink orange
          600: '#ea5a00',
          700: '#c24700',
          800: '#9a3800',
          900: '#7c2d00',
          950: '#431700',
        },
        // Navigation colors - matching FlaggerLink
        nav: {
          background: '#222',
          font: '#fff',
          selected: '#555',
          highlight: '#ff6700',
        },
        // Schedule colors
        schedule: {
          confirmed: '#4CAF50',
          timeOff: '#cc0d0d',
          unscheduled: '#999',
          unconfirmed: '#ff6700',
        },
        // General UI colors
        ui: {
          lightest: '#fff',
          light: '#f9f9f9',
          medium: '#777',
          dark: '#333',
          accent: '#d2d2d2',
          darkerAccent: '#9c9c9c',
          lightestFont: '#fff',
          darkFont: '#333',
          mediumFont: '#444',
          lightFont: '#666',
          lightestUI: '#fff',
          faintUI: '#EEE',
          lighterUI: '#DDD',
          mediumUI: '#666',
          darkUI: '#333',
          transparentUI: '#FFFFFF99',
          lightUIFont: '#EEE',
          darkUIFont: '#222',
          blueFont: '#007bff',
        },
        // Dark theme colors matching FlaggerLink website
        dark: {
          bg: '#121212',           // FlaggerLink light-background-color in dark mode
          card: '#222',            // FlaggerLink lightest-background-color in dark mode
          foreground: '#FFF',      // FlaggerLink lightest-font-color
          muted: '#AAA',           // FlaggerLink medium-font-color in dark mode
          border: '#555',          // FlaggerLink lighter-ui-color in dark mode
          hover: '#333',           // FlaggerLink faint-ui-color in dark mode
          nav: '#000',             // FlaggerLink nav-background-color in dark mode
          // Header specific colors for tables
          'header-bg': '#222',
          'header-text': '#FFF',
        }
      },
      // Add custom hover states for text colors
      textColor: {
        highlight: '#ff6700',
      },
      // Add custom hover variants
      hover: {
        textHighlight: {
          'hover:text-highlight': {
            color: '#ff6700',
          },
        },
      },
    },
  },
  plugins: [],
}

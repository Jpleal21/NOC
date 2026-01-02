<template>
  <div>
    <!-- Mobile Top Bar (only visible on mobile) -->
    <div class="mobile-top-bar">
      <div class="logo-container">
        <img src="/logo-small.png" alt="FlaggerLink" class="mobile-logo-image" />
        <span class="mobile-divider">|</span>
        <span class="app-title">NOC</span>
      </div>
      <button class="hamburger-btn" @click="toggleMobileMenu" :class="{ active: mobileMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>

    <!-- Mobile Overlay -->
    <transition name="overlay-fade">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="toggleMobileMenu"></div>
    </transition>

    <!-- Navigation Panel (sidebar on desktop, slide-in on mobile) -->
    <nav class="navigation-panel" :class="{ 'mobile-open': mobileMenuOpen }">
      <!-- NOC Header (desktop only) -->
      <div class="noc-header">
        <div class="noc-logo">
          <img src="/logo-small.png" alt="FlaggerLink" class="logo-image" />
        </div>
        <div class="noc-divider">|</div>
        <div class="noc-name">NOC</div>
      </div>

      <ul class="nav-list">
        <li v-for="(item, index) in navItems" :key="index">
          <button class="nav-button" @click="navigateTo(index, item.route)" :class="{ selected: item.selected }">
            <component :is="item.icon" />
            <span class="item-text">{{ item.text }}</span>
            <span v-if="item.count" class="nav-badge">{{ item.count }}</span>
          </button>
        </li>
      </ul>

      <div class="nav-footer">
        <!-- Dark Mode Toggle -->
        <button class="theme-btn" @click="settingsStore.toggleDarkMode">
          <svg v-if="settingsStore.darkMode" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
          </svg>
          <span class="item-text">{{ settingsStore.darkMode ? 'Dark Mode' : 'Light Mode' }}</span>
        </button>

        <!-- System Info -->
        <div class="user-section">
          <div class="user-info-btn">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span class="item-text">NOC Platform</span>
          </div>
          <div class="user-role">
            <span class="role-badge">Infrastructure</span>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, h, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSettingsStore } from '../stores/settings';

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();

const mobileMenuOpen = ref(false);

const navItems = ref([
  {
    route: '/servers',
    text: 'Servers',
    selected: false,
    count: 0,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01' })
    ])
  },
  {
    route: '/deployments',
    text: 'Deployments',
    selected: false,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' })
    ])
  },
  {
    route: '/dns',
    text: 'DNS',
    selected: false,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 0 1 9-9' })
    ])
  },
  {
    route: '/deploy',
    text: 'Deploy Server',
    selected: false,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 4v16m8-8H4' })
    ])
  },
  {
    route: '/settings',
    text: 'Settings',
    selected: false,
    icon: () => h('svg', { class: 'w-5 h-5', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' })
    ])
  },
]);

watch(route, () => {
  setActiveTab();
  // Close mobile menu on navigation
  if (mobileMenuOpen.value) {
    mobileMenuOpen.value = false;
    document.body.style.overflow = '';
  }
});

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
  // Prevent body scroll when menu is open
  if (mobileMenuOpen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

const navigateTo = (index, routePath) => {
  if (index >= 0) {
    navItems.value.forEach((item, i) => {
      item.selected = i === index;
    });
  }
  router.push(routePath);
};

const setActiveTab = () => {
  const currentPath = route.path;
  navItems.value.forEach(item => {
    item.selected = currentPath === item.route;
  });
};

// Set active tab on mount
setActiveTab();
</script>

<style scoped>
/* ==================== Mobile Top Bar ==================== */
.mobile-top-bar {
  display: none; /* Hidden on desktop */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #111827;
  z-index: 1000;
  padding: 0 1rem;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.mobile-logo-image {
  height: 32px;
  width: auto;
  display: block;
}

.mobile-divider {
  font-size: 1.5rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1;
}

.app-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.5px;
}

/* Hamburger Button */
.hamburger-btn {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 10;
}

.hamburger-btn span {
  width: 100%;
  height: 3px;
  background: #3b82f6;
  border-radius: 10px;
  transition: all 0.3s ease;
  transform-origin: center;
}

.hamburger-btn.active span:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
}

.hamburger-btn.active span:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.active span:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
}

/* Mobile Overlay */
.mobile-overlay {
  display: none; /* Hidden on desktop */
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* ==================== Navigation Panel ==================== */
.noc-header {
  width: 100%;
  padding: 20px 10px 18px 10px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 70px;
  overflow: hidden;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.noc-logo {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.noc-divider {
  font-size: 1.5rem;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1;
  opacity: 0;
  transition: opacity 0.3s;
  padding: 0 6px;
}

.noc-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.5px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s;
  font-family: 'Inter', sans-serif;
  margin-left: 4px;
}

.item-text {
  opacity: 1;
  color: #FFF;
}

.navigation-panel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  overflow: hidden;
  background-color: #111827;
}

.navigation-panel:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-list {
  list-style-type: none;
  margin: 0;
  padding: 8px 0;
  width: 100%;
  flex-grow: 1;
}

.nav-button,
.theme-btn {
  display: flex;
  align-items: center;
  width: 100%;
  height: 52px;
  padding: 0 20px 0 19px;
  color: #fff;
  text-decoration: none;
  transition: background-color 0.2s, transform 0.2s;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  position: relative;
}

.nav-button:hover,
.theme-btn:hover {
  background-color: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.nav-button svg,
.theme-btn svg {
  min-width: 22px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  transition: transform 0.2s ease, color 0.2s ease;
}

.nav-button:hover svg,
.theme-btn:hover svg {
  transform: translateY(-3px);
  color: #3b82f6;
}

.nav-button span,
.theme-btn span {
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.5px;
  white-space: nowrap;
  margin-left: 12px;
}

.nav-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #3b82f6;
  color: white;
  border-radius: 4px;
}

.selected {
  background-color: rgba(255, 255, 255, 0.15);
  position: relative;
}

.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #3b82f6;
}

.selected svg {
  color: #3b82f6;
}

.selected:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.nav-footer {
  margin-top: auto;
  padding-bottom: 15px;
  width: 100%;
}

.user-section {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
  margin-top: 10px;
}

.user-info-btn {
  display: flex;
  align-items: center;
  width: 100%;
  height: 50px;
  padding: 0 20px 0 19px;
  color: #EEE;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info-btn svg {
  min-width: 22px;
  color: #3b82f6;
  flex-shrink: 0;
}

.user-info-btn .item-text {
  margin-left: 12px;
}

.user-role {
  padding-left: 19px;
  padding-right: 20px;
  margin-top: -10px;
  margin-bottom: 10px;
  opacity: 1;
  transition: opacity 0.3s;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #3b82f6;
  color: white;
  border-radius: 4px;
  margin-left: 34px;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.2);
}

.theme-btn {
  margin-top: 5px;
}

/* ==================== Mobile Styles (<768px) ==================== */
@media screen and (max-width: 767px) {
  .mobile-top-bar {
    display: flex; /* Show on mobile */
  }

  .mobile-overlay {
    display: block; /* Show on mobile */
  }

  .navigation-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 80vw;
    z-index: 999;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
    padding-top: 60px; /* Account for top bar */
  }

  .navigation-panel.mobile-open {
    transform: translateX(0);
  }

  /* Always show text on mobile */
  .nav-button span,
  .theme-btn span,
  .item-text {
    opacity: 1;
    display: inline;
  }

  /* Hide NOC header on mobile - show in top bar instead */
  .noc-header {
    display: none;
  }
}

/* ==================== Desktop Styles (≥768px) ==================== */
@media screen and (min-width: 768px) {
  .navigation-panel {
    position: fixed;
    top: 0;
    left: 0;
    height: 100%;
    width: 60px;
    z-index: 100;
    transition: width 0.3s ease;
  }

  .navigation-panel:hover {
    width: 240px;
  }

  /* Hide text when not hovered on desktop */
  .navigation-panel:not(:hover) .nav-button span,
  .navigation-panel:not(:hover) .theme-btn span,
  .navigation-panel:not(:hover) .item-text,
  .navigation-panel:not(:hover) .user-role,
  .navigation-panel:not(:hover) .nav-badge {
    opacity: 0;
    transition: opacity 0.3s;
  }

  .navigation-panel:hover .nav-button span,
  .navigation-panel:hover .theme-btn span,
  .navigation-panel:hover .item-text,
  .navigation-panel:hover .user-role,
  .navigation-panel:hover .nav-badge {
    opacity: 1;
    transition: opacity 0.3s;
  }

  /* NOC header desktop behavior */
  .navigation-panel:not(:hover) .noc-name,
  .navigation-panel:not(:hover) .noc-divider {
    opacity: 0;
    transition: opacity 0.3s;
  }

  .navigation-panel:hover .noc-name,
  .navigation-panel:hover .noc-divider {
    opacity: 1;
    transition: opacity 0.3s;
  }
}
</style>

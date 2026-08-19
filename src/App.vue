<template>
  <div class="min-h-screen flex flex-col relative overflow-hidden">
    <!-- Ambient Background Blobs -->
    <div class="absolute top-0 left-0 w-full h-[500px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none"></div>

    <header class="sticky top-0 z-50 w-full glass border-b border-white/20 dark:border-white/5">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="flex items-center gap-2 group">
            <div class="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
            </div>
            <span class="font-bold text-xl tracking-tight text-text-main">AntiGravity</span>
          </RouterLink>

          <div class="hidden md:flex gap-4 ms-4">
            <RouterLink to="/" class="text-text-muted hover:text-primary font-medium transition-colors" active-class="text-primary">
              Home
            </RouterLink>
            <RouterLink to="/about" class="text-text-muted hover:text-primary font-medium transition-colors" active-class="text-primary">
              About
            </RouterLink>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Dark Mode Toggle -->
          <button @click="toggleDarkMode" class="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-text-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'">
            <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <main class="flex-grow flex flex-col w-full relative z-10">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <footer class="w-full border-t border-black/5 dark:border-white/5 mt-auto py-8 text-center text-text-muted">
      <p class="text-sm">
        &copy; {{ new Date().getFullYear() }} Vue 3 Boilerplate. All rights reserved.
      </p>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

const isDark = ref(false);

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
};

onMounted(() => {
  // Check local storage or system preference on load
  if (
    localStorage.theme === 'dark' ||
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true;
    document.documentElement.classList.add('dark');
  } else {
    isDark.value = false;
    document.documentElement.classList.remove('dark');
  }
});
</script>

<style>
/* Page transition animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

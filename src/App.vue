<template>
  <div class="relative flex min-h-screen flex-col overflow-hidden">
    <!-- Ambient Background Blobs -->
    <div
      class="bg-primary/10 dark:bg-primary/5 pointer-events-none absolute top-0 left-0 h-[500px] w-full -translate-y-1/2 rounded-full blur-[120px]"
    ></div>

    <header class="glass sticky top-0 z-50 w-full border-b border-white/20 dark:border-white/5">
      <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-6">
          <RouterLink to="/" class="group flex items-center gap-2">
            <div
              class="bg-primary flex h-8 w-8 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"
                />
              </svg>
            </div>
            <span class="text-text-main text-xl font-bold tracking-tight">AntiGravity</span>
          </RouterLink>

          <div class="ms-4 hidden gap-4 md:flex">
            <RouterLink
              to="/"
              class="text-text-muted hover:text-primary font-medium transition-colors"
              active-class="text-primary"
            >
              Home
            </RouterLink>
            <RouterLink
              to="/about"
              class="text-text-muted hover:text-primary font-medium transition-colors"
              active-class="text-primary"
            >
              About
            </RouterLink>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Dark Mode Toggle -->
          <button
            class="text-text-muted focus-visible:ring-primary rounded-full p-2 transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none dark:hover:bg-white/10"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleDarkMode"
          >
            <svg
              v-if="isDark"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
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
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <main class="relative z-10 flex w-full flex-grow flex-col">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer
      class="text-text-muted mt-auto w-full border-t border-black/5 py-8 text-center dark:border-white/5"
    >
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
    transition:
      opacity 0.2s ease,
      transform 0.2s ease;
  }

  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
    transform: translateY(4px);
  }
</style>

<template>
  <div class="flex flex-col w-full">
    <!-- Hero Section -->
    <section class="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 text-primary-hover dark:text-primary text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-primary-hover"></span>
        </span>
        Vue 3 Boilerplate v2.0
      </div>

      <h1 class="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        The Ultimate Starting Point for <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500">Modern Web Apps</span>
      </h1>
      
      <p class="mt-6 max-w-2xl mx-auto lead animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        Stop wrestling with configuration. Jumpstart your next project with a production-ready template featuring Vite, Tailwind CSS v4, typed linting, and automatic dark mode.
      </p>

      <div class="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
        <button class="btn-primary w-full sm:w-auto group">
          Get Started
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ms-2 group-hover:translate-x-1 transition-transform">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <button class="btn-secondary w-full sm:w-auto">
          View Documentation
        </button>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-24 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-16">
          <h2 class="inline-block">Everything you need</h2>
          <p class="mt-4 lead max-w-2xl mx-auto">
            Thoughtfully configured with industry best practices so you can focus on building features, not infrastructure.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div class="glass p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
            <div class="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m13 2-2 2.5h3L11 22l2-2.5h-3L13 2Z" />
              </svg>
            </div>
            <h3 class="mb-3">Lightning Fast</h3>
            <p class="text-text-muted">Powered by Vite for near-instant server start times and incredibly fast hot module replacement.</p>
          </div>

          <!-- Feature 2 -->
          <div class="glass p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
            <div class="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h3 class="mb-3">Beautiful UIs</h3>
            <p class="text-text-muted">Tailwind CSS v4 pre-configured with a modern design system, glassmorphism, and dark mode.</p>
          </div>

          <!-- Feature 3 -->
          <div class="glass p-8 rounded-2xl flex flex-col items-start hover:-translate-y-1 transition-transform duration-300">
            <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 class="mb-3">Strictly Typed</h3>
            <p class="text-text-muted">TypeScript and ESLint 9 Flat Config integrated tightly to catch errors before they reach production.</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
// Home logic can be added here
</script>

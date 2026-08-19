<template>
  <div class="flex w-full flex-col">
    <!-- Hero Section -->
    <section
      class="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-20 pb-32 text-center sm:px-6 lg:px-8"
    >
      <div
        class="bg-primary/10 dark:bg-primary/20 text-primary-hover dark:text-primary animate-in fade-in slide-in-from-bottom-4 mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold duration-500"
      >
        <span class="relative flex h-2 w-2">
          <span
            class="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          ></span>
          <span class="bg-primary-hover relative inline-flex h-2 w-2 rounded-full"></span>
        </span>
        Vue 3 Boilerplate v2.0
      </div>

      <h1
        class="animate-in fade-in slide-in-from-bottom-8 mx-auto max-w-4xl delay-150 duration-700"
      >
        The Ultimate Starting Point for
        <span class="from-primary bg-gradient-to-r to-indigo-500 bg-clip-text text-transparent"
          >Modern Web Apps</span
        >
      </h1>

      <p
        class="lead animate-in fade-in slide-in-from-bottom-8 mx-auto mt-6 max-w-2xl delay-300 duration-700"
      >
        Stop wrestling with configuration. Jumpstart your next project with a production-ready
        template featuring Vite, Tailwind CSS v4, typed linting, and automatic dark mode.
      </p>

      <div
        class="animate-in fade-in slide-in-from-bottom-8 mt-10 flex flex-col items-center justify-center gap-4 delay-500 duration-700 sm:flex-row"
      >
        <button class="btn-primary group w-full sm:w-auto">
          Get Started
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="ms-2 transition-transform group-hover:translate-x-1"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
        <button class="btn-secondary w-full sm:w-auto">View Documentation</button>
      </div>
    </section>

    <!-- Features Section -->
    <section class="border-t border-black/5 bg-black/5 py-24 dark:border-white/5 dark:bg-white/5">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-16 text-center">
          <h2 class="inline-block">Everything you need</h2>
          <p class="lead mx-auto mt-4 max-w-2xl">
            Thoughtfully configured with industry best practices so you can focus on building
            features, not infrastructure.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
          <!-- Feature 1 -->
          <div
            class="glass flex flex-col items-start rounded-2xl p-8 transition-transform duration-300 hover:-translate-y-1"
          >
            <div
              class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m13 2-2 2.5h3L11 22l2-2.5h-3L13 2Z" />
              </svg>
            </div>
            <h3 class="mb-3">Lightning Fast</h3>
            <p class="text-text-muted">
              Powered by Vite for near-instant server start times and incredibly fast hot module
              replacement.
            </p>
          </div>

          <!-- Feature 2 -->
          <div
            class="glass flex flex-col items-start rounded-2xl p-8 transition-transform duration-300 hover:-translate-y-1"
          >
            <div
              class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <h3 class="mb-3">Beautiful UIs</h3>
            <p class="text-text-muted">
              Tailwind CSS v4 pre-configured with a modern design system, glassmorphism, and dark
              mode.
            </p>
          </div>

          <!-- Feature 3 -->
          <div
            class="glass flex flex-col items-start rounded-2xl p-8 transition-transform duration-300 hover:-translate-y-1"
          >
            <div
              class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <h3 class="mb-3">Strictly Typed</h3>
            <p class="text-text-muted">
              TypeScript and ESLint 9 Flat Config integrated tightly to catch errors before they
              reach production.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
  // Home logic can be added here
</script>

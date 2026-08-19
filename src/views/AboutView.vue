<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
    <RouterLink 
      to="/" 
      class="inline-flex items-center text-sm font-medium text-primary hover:underline mb-8 group"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2" 
        stroke-linecap="round" 
        stroke-linejoin="round" 
        class="me-2 group-hover:-translate-x-1 transition-transform"
      >
        <path d="m15 18-6-6 6-6" />
      </svg>
      Back to Home
    </RouterLink>

    <article class="prose prose-slate dark:prose-invert prose-lg max-w-none">
      <h1>About This Template</h1>
      <p>
        This boilerplate was meticulously crafted to provide a solid, opinionated starting point for 
        modern web applications. It eliminates the configuration fatigue commonly associated with 
        starting new frontend projects.
      </p>

      <h2>Core Philosophy</h2>
      <p>
        We believe that developers should spend their time building product features, not wrestling 
        with bundlers, linters, and CSS frameworks. That's why we've pre-configured the best tools 
        available in the Vue ecosystem.
      </p>

      <ul>
        <li><strong>Vite:</strong> For incredibly fast local development and optimized production builds.</li>
        <li><strong>Tailwind CSS v4:</strong> For rapid, utility-first styling with a built-in design system.</li>
        <li><strong>TypeScript & ESLint:</strong> For strict, type-safe code that catches bugs early.</li>
        <li><strong>Pinia:</strong> The intuitive, type-safe state management library for Vue.</li>
      </ul>

      <h2>Get Involved</h2>
      <p>
        If you find this boilerplate useful, feel free to use it as a foundation for your personal 
        projects, client work, or enterprise applications. Happy coding!
      </p>
    </article>
  </div>
</template>

<script lang="ts" setup>
// About logic can be added here
</script>

# Project Context: Vue 3 + Vite + Tailwind CSS 4

## Tech Stack

- **Framework**: Vue 3 (Composition API with `<script setup>`)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4 (using `@tailwindcss/vite` plugin)
- **State Management**: Pinia
- **Routing**: Vue Router
- **Language**: TypeScript (Strict mode)
- **Linting/Formatting**: ESLint 9 (Flat Config), Prettier, Stylelint
- **Type Checking**: vue-tsc

## Project Structure

- `src/components/`: Reusable UI components.
- `src/components/base/`: Atomic/Base components (e.g., `BaseIcon.vue`, `BaseButton.vue`).
- `src/views/`: Page-level components used by Vue Router.
- `src/composables/`: Shared stateful logic (Composition Functions).
- `src/stores/`: Pinia store definitions. Files must follow the `*.store.ts` naming convention.
- `src/services/`: Services for external API calls and business logic. Files must follow the `*.service.ts` naming convention.
- `src/router/`: Route definitions.
- `src/types/`: Global TypeScript interfaces and types.
- `src/utils/`: Pure helper functions (formatters, validators, loggers).
- `src/assets/`: Static assets and global CSS (including `main.css`).
- `@/`: Alias for the `src` directory.

## Coding Standards

### Vue Components

- **Block Order**: Always use the following structure:
  1. `<template>`
  2. `<script setup lang="ts">`
  3. `<style>` (only if necessary)
- **Reactivity**: Prefer `ref()` over `reactive()` for all state primitives and objects to maintain clear `.value` usage.
- **Props/Emits**: Use compiler-macros: `defineProps<{ ... }>()` and `defineEmits<{ ... }>()`.
- **Accessibility (a11y)**:
  - Use **Semantic HTML** tags (e.g., `<nav>`, `<main>`, `<article>`, `<button>`).
  - Ensure all interactive elements have visible `focus-visible` states.
  - Provide `aria-label` or `aria-labelledby` for icon-only buttons.
- **Iconography**:
  - **Default**: Use [Lucide Icons](https://lucide.dev/) and [Lucide Animated](https://lucide-animated.com/).
  - **SVG Strategy**: Use neutral/white SVGs as base. Colorize them using Tailwind CSS text-color classes (e.g., `text-primary`).
  - **Custom SVGs**: Ensure custom SVGs use `stroke="currentColor"` or `fill="currentColor"` to allow CSS color injection.
- **Utility First**: Leverage Tailwind utility classes. Avoid `<style scoped>` unless strictly necessary for third-party overrides.

### TypeScript

- Use strict typing. Avoid `any`.
- Prefer `interface` for object shapes and `type` for unions/aliases.

### Clean Code & Documentation

- **Self-Documenting Code**: Prioritize highly descriptive variable and function names (e.g., `isUserAuthenticated` instead of `auth`). The intent should be clear from the name alone.
- **Mandatory Function Comments**: Every function, action, and composable must include a brief JSDoc comment.
  - **Standard**: Comments should be an _addition_ to self-documenting code, explaining the "why" or providing a quick summary, not just restating the function name.
- **Concise Logic**: Avoid "death by comments." Keep inline comments extremely brief and only use them when logic is non-obvious.
- **Unit Testing**: Tests (Vitest/Cypress) are only to be generated upon explicit request.

### State Management (Pinia)

- **Setup Store Syntax**: Use the function syntax (`defineStore('id', () => { ... })`).
- **Modular Architecture**: **Avoid "Mega Stores".** Break logic into small, domain-specific stores (e.g., `useAuthStore`, `useUserStore`, `useUIStore`).
- **Cross-Store Communication**: Import and instantiate required stores within the actions/getters of other stores as needed.
- **Destructuring**: Always use `storeToRefs()` when destructuring state or getters to maintain reactivity.

### Styling (Tailwind CSS 4)

- **RTL & Logical Properties**: Always use logical properties (`ms-`, `pe-`, `text-start`, `border-s`) instead of physical directions (`ml-`, `pr-`, `text-left`, `border-l`) to ensure native Right-to-Left (RTL) language support.
- **CSS-First Configuration**: All theme configuration is handled in `src/assets/main.css` via the `@theme` block.
- **Color Variable Hierarchy**:
  1. **Logical/Brand Colors**: Define specific brand identity colors (e.g., `--color-brand-green: #2ecc71;`).
  2. **Semantic/Generic Colors**: Define functional variables (e.g., `--color-primary`, `--color-surface`, `--color-text-main`) that reference the brand variables via `var()`.
- **Semantic-First Approach**: Always use generic/semantic variables for the majority of the application. Brand-specific variables should only be used for fixed identity elements.
- **Responsive Design**: Follow a **Mobile-First** approach using Tailwind responsive prefixes (`sm:`, `md:`, `lg:`).
- **Micro-animations**:
  - Incorporate subtle transitions (hover scales, gentle fades) to make the UI feel fresh and modern.
  - **A11y**: Use `motion-safe:` variants and respect `prefers-reduced-motion`.
- **Organization via Layers**: Wrap global CSS in `@layer components` or `@layer utilities`.

- **Typography & Shared Utility Classes**: Centralize typography and shared UI classes in `src/assets/main.css` so look-and-feel changes are easy and consistent across the app. Recommended practices:
  - Style standard HTML elements (e.g., `h1`, `h2`, `h3`) directly inside `@layer base` in `main.css` using `@apply`. This ensures consistent global typography without needing to add classes to every tag.
  - Create semantic, reusable classes for common text styles that aren't tied to specific HTML elements (for example: `.lead`, `.muted`) inside `@layer components`.
  - Example in `src/assets/main.css`:

```css
@layer base {
  h1 {
    @apply text-brand-500 text-3xl leading-tight font-semibold md:text-4xl;
  }
  h2 {
    @apply text-brand-500 text-2xl leading-snug font-medium md:text-3xl;
  }
  h3 {
    @apply text-brand-500 text-xl leading-snug font-medium md:text-2xl;
  }
}

@layer components {
  .lead {
    @apply text-brand-700 text-lg opacity-80;
  }
  .muted {
    @apply text-brand-700 text-sm opacity-60;
  }
}
```

- Prefer semantic names (e.g., `.heading-primary`, `.heading-secondary`, `.prose-lead`) when creating custom utility classes that better communicate intent. Keep names consistent across the project.
- Because headings are styled globally via `@layer base`, you can simply use the raw tags in your templates (e.g., `<h1>Title</h1>`) to keep components thin and make global branding updates trivial.
- Reserve component-level classes for layout-specific overrides only. If a visual pattern is reused, move it into `main.css` as a named class.

- **Custom Utilities & @apply**: Strongly encourage defining custom utilities and component classes using `@apply` in `src/assets/main.css` rather than duplicating long utility lists in every component. This improves maintainability, keeps component templates readable, and ensures visual consistency. Keep each custom class focused and small—compose rather than duplicate.

### Error Handling & Logging

- **Resilient Processes**: Wrap asynchronous requests and high-risk logic in `try-catch` blocks.
- **Logging**: **Strictly avoid using random `console.log` statements.** Always use the custom flexible logging utility (`src/utils/logger.ts`) across the project. Import and use the pre-configured `logger` instance (e.g., `logger.info()`, `logger.error()`, `logger.debug()`) to ensure proper log levels are respected and messages are formatted consistently.
- **User Feedback**: Never allow a silent failure. Always provide UI feedback (Toasts, error banners, or skeleton states) to inform the user of progress or issues.

## Task Management & Documentation

- **Checklist Format**: `[ ]` for pending, `[X]` for completed.
- **Completion Summaries**: Provide a concise summary of the specific actions performed after marking a task as complete.
- **README Updates**: **Must** keep the README up to date when making amendments (this README will either be at the root of the project, or in the case of plugins, will be in the plugins folder).
- **Deployment and Commits**: Read the [Release Process documentation](./.supporting_docs/RELEASE_PROCESS.md) for rules regarding git commit tags/prefixes (e.g., `feat`, `fix`, `docs`) and how they interact with the automated deployment system. Use `docs` when updating a doc without wanting to trigger a release.

## Common Commands

- Development: `npm run dev`
- Build: `npm run build`
- Type Check: `npm run type-check`
- Linting: `npm run lint`

## Specific Instructions for Gemini

- **Template Order**: Follow **template -> script -> style**.
- **Naming & JSDoc**: Use intent-revealing names and include a one-line JSDoc header for all functions. For files, strictly use `[name].store.ts` for stores and `[name].service.ts` for services.
- **No Automatic Tests**: Do not generate test files unless specifically asked.
- **Robust Error Handling**: Always include `try-catch` blocks with console logging and a UI feedback strategy (e.g., loading states) for async logic.
- **Mobile-First**: Generate responsive layouts by default.
- **Incorporate Motion**: Suggest or implement subtle micro-animations (e.g., `hover:scale-105 transition-all`) for interactive elements.
- **Domain-Specific Stores**: If a request involves new state, suggest a **new specific store** rather than bloating an existing one.
- **Logic Extraction**: If logic in a component exceeds 50 lines, suggest moving it to a `src/composables/` or `src/utils/` file.
- **Route Lazy Loading**: When adding routes to `src/router/index.ts`, always use dynamic imports: `() => import('@/views/MyView.vue')`.
- **Semantic Colors**: Prioritize generic semantic utility classes (e.g., `text-primary`, `bg-background`) over brand-specific ones.
- **Anti-Gravity CLI (Local vs. Remote)**: When running locally on the user's machine, **never** automatically run linters, TS checks, formatters, etc. Instead, prompt the user to run the checks manually.
- **Token Optimization**: Give concise responses. Avoid filler and pleasantries. Output targeted code modifications (e.g., using diffs or search-and-replace blocks) rather than outputting entire files unless requested.

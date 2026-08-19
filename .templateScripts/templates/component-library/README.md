# {{PASCAL_PLUGIN_NAME}}

A Vue component library.

## Usage

To use the components from this library, import them and register them in your Vue application:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { YourComponent } from '{{PLUGIN_NAME}}'

const app = createApp(App)

app.component('YourComponent', YourComponent)

app.mount('#app')
```

## Development

To work on this component library:

- `npm run dev`: Build the library in watch mode.
- `npm run build`: Build the library for production.

This package is part of a workspace. Ensure you run `npm install` from the project root after creating it.

## Documentation

If you elected to deploy documentation to GitHub Pages during setup, your project includes a dynamic VitePress site!
- `npm run docs:dev`: Start the local documentation server.
- `npm run docs:build`: Build the documentation site for production.

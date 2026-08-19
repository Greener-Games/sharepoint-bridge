# {{PASCAL_PLUGIN_NAME}}

A Vue plugin package.

## Usage

To use this plugin in your Vue application, import it and install it with `app.use()`:

```ts
import { createApp } from 'vue'
import App from './App.vue'
import {{PASCAL_PLUGIN_NAME}} from '{{PLUGIN_NAME}}'

const app = createApp(App)

app.use({{PASCAL_PLUGIN_NAME}})

app.mount('#app')
```

## Development

To work on this plugin:

- `npm run dev`: Build the plugin in watch mode.
- `npm run build`: Build the plugin for production.

This package is part of a workspace. Ensure you run `npm install` from the project root after creating it.

## Documentation

If you elected to deploy documentation to GitHub Pages during setup, your project includes a dynamic VitePress site!
- `npm run docs:dev`: Start the local documentation server.
- `npm run docs:build`: Build the documentation site for production.

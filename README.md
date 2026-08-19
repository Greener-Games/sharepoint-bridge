# Vue 3 + TypeScript + Vite + Plugins

This robust, highly-automated boilerplate supports standard application development, NPM plugin development, Electron app creation, and Browser Extension building. It comes fully equipped with a unified CI/CD pipeline powered by `semantic-release`.

## Setup Script

This project strictly relies on a CLI setup script to intelligently scaffold your architecture, build your GitHub Actions, and dynamically wire up your workspace. 

Run the setup script to begin:

```sh
node .templateScripts/setup.cjs
```

### Options

1. **Project Development**: Scaffolds a standard frontend web application, configuring CI/CD hosting deployments based on your cloud provider of choice.
2. **Plugin Development**: Scaffolds a new plugin (Vue UI Component Library, Vue Plugin, Vite Plugin, or generic TS Utility). Automatically configures workspace logic and NPM publishing pipelines.
3. **Electron App**: Scaffolds an Electron desktop application setup and links it to a desktop-specific release pipeline.
4. **Browser Extension**: Scaffolds a Chrome/Firefox/Edge extension setup.

## Documentation Generation

During plugin development, the CLI will ask if you want to deploy documentation. If you opt-in:
- The script dynamically injects an interactive **VitePress** documentation site into your new plugin's `docs/` folder.
- It seamlessly updates your `publish_package.yml` CI pipeline to deploy your docs to GitHub Pages immediately following a successful NPM package release!

Run `npm run docs:dev` inside your plugin folder to preview your site.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

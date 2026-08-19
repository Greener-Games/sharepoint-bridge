import type { App } from 'vue';

// Define options type for your plugin
export interface {{PASCAL_PLUGIN_NAME}}Options {
  // Add plugin options here
}

export const {{PASCAL_PLUGIN_NAME}}Plugin = {
  install(app: App, options?: {{PASCAL_PLUGIN_NAME}}Options) {
    // Inject dependencies, components, or global properties here
    console.log('{{PLUGIN_NAME}} installed with options:', options);
  }
};

export default {{PASCAL_PLUGIN_NAME}}Plugin;

// Export standard composables or functions
export function use{{PASCAL_PLUGIN_NAME}}() {
  return {
    hello: 'World from {{PLUGIN_NAME}}'
  };
}
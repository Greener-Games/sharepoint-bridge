import type { App } from 'vue';
import {{PASCAL_PLUGIN_NAME}}Component from './{{PASCAL_PLUGIN_NAME}}Component.vue';

export default {
  install(app: App) {
    app.component('{{PASCAL_PLUGIN_NAME}}Component', {{PASCAL_PLUGIN_NAME}}Component);
    console.log('{{PLUGIN_NAME}} installed');
  }
};

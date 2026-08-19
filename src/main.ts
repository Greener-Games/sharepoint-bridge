import { createApp } from 'vue'
import App from '@/App.vue'

import '@/assets/main.css'

import router from '@/router'
import { createPinia } from 'pinia'
import { logger } from '@/utils/logger';

// Example usage of the custom logger
logger.info('Application initializing...');
logger.debug('Debug mode is active.');

const app = createApp(App)
app.use(createPinia())
app.use(router)

app.mount('#app')
logger.info('Application successfully mounted.');

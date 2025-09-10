import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const vscode = acquireVsCodeApi();
const pinia = createPinia();

const app = createApp(App, { vscode });
app.use(pinia);
app.mount('#app');

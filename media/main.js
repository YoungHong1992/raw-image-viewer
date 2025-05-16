import { createApp } from 'vue';
import App from './App.vue';

// @ts-ignore
const vscode = acquireVsCodeApi();

const app = createApp(App, { vscode });
app.mount('#app');
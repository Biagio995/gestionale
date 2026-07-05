import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { createAppI18n } from './i18n';
import { getStoredToken, setUnauthorizedHandler } from './services/api';
import { useAuthStore } from './stores/auth';
import './assets/main.css';

const i18n = createAppI18n();

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(i18n);
app.use(router);

const auth = useAuthStore();
setUnauthorizedHandler(() => {
  auth.clearSession();
  const current = router.currentRoute.value;
  if (current.meta.requiresAuth) {
    void router.push({ name: 'login', query: { session: 'expired' } });
  }
});

if (getStoredToken()) {
  void router.isReady();
}

app.mount('#app');

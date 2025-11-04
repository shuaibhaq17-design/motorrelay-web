import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/tailwind.css';
import { useAuthStore as authStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);

const auth = authStore(pinia);
const initialization = auth.initialize();
const publicRoutes = new Set(['login', 'signup']);

router.beforeEach(async (to, from, next) => {
  await initialization;

  if (auth.token && !auth.user && !auth.loading) {
    await auth.fetchMe();
  }

  const isPublic = publicRoutes.has(to.name);

  if (!auth.isAuthenticated && !isPublic) {
    const redirectPath = to.fullPath !== '/login' ? to.fullPath : undefined;
    next(
      redirectPath
        ? { name: 'login', query: { redirect: redirectPath } }
        : { name: 'login' }
    );
    return;
  }

  if (auth.isAuthenticated && to.name === 'login') {
    next({ name: 'home' });
    return;
  }

  const requiredRole = to.meta?.requiresRole;
  if (requiredRole && auth.role !== requiredRole) {
    next({ name: 'home' });
    return;
  }

  next();
});

app.use(router);
app.mount('#app');

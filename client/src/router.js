import { createRouter, createWebHistory } from 'vue-router';
import LoginView from './views/LoginView.vue';
import CarouselView from './views/CarouselView.vue';
import UploadView from './views/UploadView.vue';
import SettingsView from './views/SettingsView.vue';
import SaintsView from './views/SaintsView.vue';

const routes = [
  { path: '/login', component: LoginView },
  { path: '/', component: CarouselView, meta: { requiresAuth: true } },
  { path: '/upload', component: UploadView, meta: { requiresAuth: true } },
  { path: '/settings', component: SettingsView, meta: { requiresAuth: true } },
  { path: '/saints', component: SaintsView, meta: { requiresAuth: true } }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else {
    next();
  }
});

export default router;

<template>
  <div class="app-layout">
    <nav v-if="isLoggedIn" class="navbar">
      <div class="links">
        <router-link to="/">Carrousel</router-link>
        <router-link to="/upload">Images & Dates</router-link>
        <router-link to="/saints">Saints</router-link>
        <router-link to="/settings">Paramètres</router-link>
      </div>
      <button @click="logout" class="btn-logout">Déconnexion</button>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const isLoggedIn = computed(() => route.path !== '/login' && !!localStorage.getItem('token'));

const logout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: system-ui, sans-serif; }
body { background: #121212; color: #f5f5f5; }
.navbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 2rem; background: #1e1e1e; border-bottom: 1px solid #333;
}
.links { display: flex; gap: 1.5rem; }
.links a { color: #aaa; text-decoration: none; font-weight: 500; }
.links a.router-link-active { color: #42b883; }
.btn-logout {
  background: #e53935; color: white; border: none; padding: 0.5rem 1rem;
  border-radius: 4px; cursor: pointer;
}
main { padding: 2rem; max-width: 1200px; margin: 0 auto; }
</style>

<template>
  <div class="login-container">
    <form @submit.prevent="login" class="login-card">
      <h2>Connexion requise</h2>
      <input v-model="username" type="text" placeholder="Identifiant" required />
      <input v-model="password" type="password" placeholder="Mot de passe" required />
      <p v-if="error" class="error">{{ error }}</p>
      <button type="submit">Se connecter</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const username = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();

const login = async () => {
  error.value = '';
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.value, password: password.value })
  });
  const data = await res.json();
  if (res.ok) {
    localStorage.setItem('token', data.token);
    router.push('/');
  } else {
    error.value = data.error || 'Erreur de connexion';
  }
};
</script>

<style scoped>
.login-container { display: flex; justify-content: center; align-items: center; height: 80vh; }
.login-card {
  background: #1e1e1e; padding: 2rem; border-radius: 8px; width: 320px;
  display: flex; flex-direction: column; gap: 1rem;
}
input { padding: 0.75rem; border-radius: 4px; border: 1px solid #333; background: #2a2a2a; color: white; }
button { padding: 0.75rem; background: #42b883; color: #121212; font-weight: bold; border: none; border-radius: 4px; cursor: pointer; }
.error { color: #ef5350; font-size: 0.9rem; }
</style>

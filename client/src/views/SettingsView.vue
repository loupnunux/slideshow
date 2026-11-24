<template>
  <div class="settings-page">
    <h2>Paramètres du carrousel</h2>
    <form @submit.prevent="saveSettings" class="settings-form">
      <label>
        Durée d'affichage par image (en secondes) :
        <input v-model.number="speedSeconds" type="number" min="1" max="120" required />
      </label>

      <label>
        Effet de transition :
        <select v-model="transition">
          <option value="fade">Fondu (Fade)</option>
          <option value="slide">Glissement (Slide)</option>
        </select>
      </label>

      <div class="sub-section">
        <h3>Saints</h3>
        <label class="checkbox-label">
          <input v-model="saintsEnabled" type="checkbox" />
          <span>Activer l'affichage de l'image Saints dans le carrousel</span>
        </label>

        <label>
          Image Saints à afficher :
          <select v-model="saintsImageId" :disabled="!saintsEnabled">
            <option value="">-- Sélectionner une image --</option>
            <option v-for="img in images" :key="img.id" :value="img.id">
              {{ img.title }} ({{ img.startDate }} → {{ img.endDate }})
            </option>
          </select>
        </label>
      </div>

      <div class="sub-section">
        <h3>Météo</h3>
        <label class="checkbox-label">
          <input v-model="weatherEnabled" type="checkbox" />
          <span>Afficher une page météo dans le carrousel</span>
        </label>

        <label>
          Nom de la ville :
          <input
            v-model="weatherCity"
            type="text"
            placeholder="Ex : Paris, Lyon, Saint-Clément..."
            :disabled="!weatherEnabled"
            :required="weatherEnabled"
          />
        </label>
      </div>

      <button type="submit">Enregistrer</button>
      <p v-if="saved" class="success">Paramètres enregistrés !</p>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const token = localStorage.getItem('token');
const speedSeconds = ref(3);
const transition = ref('fade');
const saintsEnabled = ref(false);
const saintsImageId = ref('');
const weatherEnabled = ref(false);
const weatherCity = ref('');
const images = ref([]);
const saved = ref(false);

onMounted(async () => {
  const headers = { Authorization: `Bearer ${token}` };
  const [setRes, imgRes] = await Promise.all([
    fetch('/api/settings', { headers }),
    fetch('/api/images', { headers })
  ]);

  if (setRes.ok) {
    const data = await setRes.json();
    speedSeconds.value = Math.round((data.speed || 3000) / 1000);
    transition.value = data.transition || 'fade';
    saintsEnabled.value = Boolean(data.saintsEnabled);
    saintsImageId.value = data.saintsImageId || '';
    weatherEnabled.value = Boolean(data.weatherEnabled);
    weatherCity.value = data.weatherCity || '';
  }

  if (imgRes.ok) {
    images.value = await imgRes.json();
  }
});

const saveSettings = async () => {
  saved.value = false;
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      speed: speedSeconds.value * 1000,
      transition: transition.value,
      saintsEnabled: saintsEnabled.value,
      saintsImageId: saintsImageId.value,
      weatherEnabled: weatherEnabled.value,
      weatherCity: weatherCity.value
    })
  });
  if (res.ok) saved.value = true;
};
</script>

<style scoped>
.settings-form {
  background: #1e1e1e; padding: 1.5rem; border-radius: 8px;
  display: flex; flex-direction: column; gap: 1.2rem; max-width: 480px; margin-top: 1rem;
}
label { display: flex; flex-direction: column; gap: 0.5rem; }
.checkbox-label { flex-direction: row; align-items: center; gap: 0.6rem; cursor: pointer; }
.checkbox-label input { width: auto; cursor: pointer; }
input, select {
  padding: 0.6rem; background: #2a2a2a; border: 1px solid #333;
  color: white; border-radius: 4px;
}
input:disabled, select:disabled { opacity: 0.5; cursor: not-allowed; }
.sub-section {
  border-top: 1px solid #333; padding-top: 1.2rem;
  display: flex; flex-direction: column; gap: 0.9rem;
}
.sub-section h3 { font-size: 1.05rem; color: #42b883; }
button {
  padding: 0.75rem; background: #42b883; color: #121212;
  font-weight: bold; border: none; border-radius: 4px; cursor: pointer;
}
.success { color: #42b883; font-size: 0.9rem; }
</style>


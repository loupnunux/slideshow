<template>
  <div ref="carouselWrapper" class="carousel-wrapper">
    <div v-if="images.length === 0" class="empty-state">
      Aucune image programmée pour la date d'aujourd'hui.
    </div>

    <div v-else class="slide-container">
      <transition :name="settings.transition">
        <!-- Slide Météo -->
        <div
          v-if="currentImage.type === 'weather'"
          :key="currentImage.id"
          class="slide-item weather-slide"
        >
          <div class="weather-card">
            <div class="weather-header">
              <h2>{{ currentImage.weather.city }}</h2>
              <span v-if="currentImage.weather.region" class="weather-region">
                {{ currentImage.weather.region }}
              </span>
            </div>

            <div class="weather-main">
              <span class="weather-icon">{{ currentImage.weather.icon }}</span>
              <span class="weather-temp">{{ currentImage.weather.temperature }}°C</span>
            </div>

            <p class="weather-condition">{{ currentImage.weather.condition }}</p>

            <div class="weather-details">
              <div class="detail-box">
                <span class="detail-label">Min / Max</span>
                <strong>{{ currentImage.weather.tempMin }}° / {{ currentImage.weather.tempMax }}°</strong>
              </div>
              <div class="detail-box">
                <span class="detail-label">Ressenti</span>
                <strong>{{ currentImage.weather.apparentTemperature }}°C</strong>
              </div>
              <div class="detail-box">
                <span class="detail-label">Humidité</span>
                <strong>{{ currentImage.weather.humidity }} %</strong>
              </div>
              <div class="detail-box">
                <span class="detail-label">Vent</span>
                <strong>{{ currentImage.weather.windSpeed }} km/h</strong>
              </div>
            </div>

            <!-- Prévisions des 2 prochains jours -->
            <div
              v-if="currentImage.weather.forecast && currentImage.weather.forecast.length"
              class="weather-forecast"
            >
              <div
                v-for="day in currentImage.weather.forecast"
                :key="day.date"
                class="forecast-card"
              >
                <span class="forecast-day">{{ day.dayLabel }}</span>
                <div class="forecast-mid">
                  <span class="forecast-icon">{{ day.icon }}</span>
                  <span class="forecast-cond">{{ day.condition }}</span>
                </div>
                <div class="forecast-temps">
                  <span class="temp-min">{{ day.tempMin }}°</span>
                  <span class="temp-sep">/</span>
                  <strong class="temp-max">{{ day.tempMax }}°</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Slide Image (classique ou Saints) -->
        <div v-else :key="currentImage.id" class="slide-item">
          <img
            :src="`/uploads/${currentImage.filename}?token=${token}`"
            :alt="currentImage.title"
            class="slide-image"
          />

          <div v-if="currentImage.saintsText" class="saint-overlay">
            <h1 class="saint-name">{{ currentImage.saintsText }}</h1>
          </div>
        </div>
      </transition>
    </div>

    <button @click="toggleFullscreen" class="btn-fullscreen" title="Plein écran">
      ⛶ Plein écran
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const token = localStorage.getItem('token');
const images = ref([]);
const currentIndex = ref(0);
const settings = ref({ speed: 3000, transition: 'fade' });
const carouselWrapper = ref(null);

let slideTimer = null;
let refreshTimer = null;

const currentImage = computed(() => images.value[currentIndex.value] || {});

const fetchData = async () => {
  const headers = { Authorization: `Bearer ${token}` };
  const [imgRes, setRes] = await Promise.all([
    fetch('/api/images/active', { headers }),
    fetch('/api/settings', { headers })
  ]);
  if (imgRes.ok) {
    images.value = await imgRes.json();
    if (currentIndex.value >= images.value.length) currentIndex.value = 0;
  }
  if (setRes.ok) {
    settings.value = await setRes.json();
  }
};

const startCarousel = () => {
  clearInterval(slideTimer);
  slideTimer = setInterval(() => {
    if (images.value.length > 1) {
      currentIndex.value = (currentIndex.value + 1) % images.value.length;
    }
  }, settings.value.speed);
};

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    carouselWrapper.value?.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

onMounted(async () => {
  await fetchData();
  startCarousel();
  // Vérifie toutes les minutes si les images, les paramètres, la météo ou le saint du jour ont changé
  refreshTimer = setInterval(async () => {
    await fetchData();
    startCarousel();
  }, 60000);
});

onUnmounted(() => {
  clearInterval(slideTimer);
  clearInterval(refreshTimer);
});
</script>

<style scoped>
.carousel-wrapper {
  position: relative; width: 100%; height: 75vh; background: #000;
  border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.carousel-wrapper:fullscreen { border-radius: 0; width: 100vw; height: 100vh; }
.slide-container { width: 100%; height: 100%; position: relative; }
.slide-item {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.slide-image {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain;
}
.saint-overlay {
  position: relative;
  z-index: 5;
  text-align: center;
  padding: 1.5rem 2.5rem;
  max-width: 85%;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}
.saint-name {
  font-size: clamp(1.8rem, 4vw, 3.6rem);
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.85);
  line-height: 1.2;
}
.weather-slide {
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
  padding: 1.5rem;
}
.weather-card {
  text-align: center;
  color: #ffffff;
  max-width: 780px;
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}
.weather-header h2 {
  font-size: clamp(1.8rem, 3.5vw, 2.8rem);
  font-weight: 700;
}
.weather-region {
  color: #b0bec5;
  font-size: 1rem;
}
.weather-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  margin: 1rem 0 0.4rem;
}
.weather-icon {
  font-size: clamp(3.2rem, 6.5vw, 5.2rem);
}
.weather-temp {
  font-size: clamp(3rem, 6vw, 5rem);
  font-weight: 800;
}
.weather-condition {
  font-size: clamp(1.15rem, 2vw, 1.6rem);
  color: #80cbc4;
  margin-bottom: 1.4rem;
}
.weather-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.85rem;
}
.detail-box {
  background: rgba(0, 0, 0, 0.25);
  padding: 0.75rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.detail-label {
  font-size: 0.8rem;
  color: #b0bec5;
  text-transform: uppercase;
}
.detail-box strong {
  font-size: 1.15rem;
}
.weather-forecast {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.85rem;
}
.forecast-card {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}
.forecast-day {
  font-weight: 600;
  font-size: 0.95rem;
  text-align: left;
}
.forecast-mid {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.forecast-icon {
  font-size: 1.6rem;
}
.forecast-cond {
  font-size: 0.85rem;
  color: #cfd8dc;
}
.forecast-temps {
  font-size: 1.05rem;
  white-space: nowrap;
}
.temp-min {
  color: #90caf9;
}
.temp-sep {
  margin: 0 0.2rem;
  color: #78909c;
}
.temp-max {
  color: #ffcc80;
}
.btn-fullscreen {
  position: absolute; bottom: 20px; right: 20px; z-index: 10;
  background: rgba(0, 0, 0, 0.6); color: white; border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.6rem 1rem; border-radius: 6px; cursor: pointer; opacity: 0.4; transition: opacity 0.3s;
}
.carousel-wrapper:hover .btn-fullscreen { opacity: 1; }
.empty-state { color: #888; font-size: 1.2rem; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.8s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: transform 0.7s ease; }
.slide-enter-from { transform: translateX(100%); }
.slide-leave-to { transform: translateX(-100%); }
</style>
